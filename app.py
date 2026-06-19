from flask import Flask, jsonify, render_template, request
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
import re
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

# In-memory cache for parsed releases
cache = {
    'releases': [],
    'last_updated': None
}

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def parse_html_updates(html_content):
    if not html_content:
        return []
    
    soup = BeautifulSoup(html_content, 'html.parser')
    updates = []
    
    current_type = "General"
    current_elements = []
    
    for element in soup.contents:
        if hasattr(element, 'name') and element.name == 'h3':
            if current_elements:
                html_text = "".join(str(e) for e in current_elements)
                # Parse to text and clean whitespace
                clean_text = BeautifulSoup(html_text, 'html.parser').get_text().strip()
                clean_text = re.sub(r'\s+', ' ', clean_text)
                
                updates.append({
                    'type': current_type,
                    'content_html': html_text,
                    'text': clean_text
                })
                current_elements = []
            current_type = element.get_text().strip()
        else:
            current_elements.append(element)
            
    if current_elements:
        html_text = "".join(str(e) for e in current_elements)
        clean_text = BeautifulSoup(html_text, 'html.parser').get_text().strip()
        clean_text = re.sub(r'\s+', ' ', clean_text)
        
        updates.append({
            'type': current_type,
            'content_html': html_text,
            'text': clean_text
        })
        
    return updates

def fetch_releases():
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    try:
        response = requests.get(FEED_URL, headers=headers, timeout=15)
        response.raise_for_status()
    except Exception as e:
        app.logger.error(f"Error fetching feed from Google: {e}")
        return None

    try:
        root = ET.fromstring(response.content)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        releases = []
        for entry in root.findall('atom:entry', ns):
            title_el = entry.find('atom:title', ns)
            title = title_el.text if title_el is not None else "Unknown Date"
            
            id_el = entry.find('atom:id', ns)
            id_val = id_el.text if id_el is not None else ""
            
            updated_el = entry.find('atom:updated', ns)
            updated = updated_el.text if updated_el is not None else ""
            
            # Find link
            link_el = entry.find('atom:link[@rel="alternate"]', ns)
            if link_el is None:
                link_el = entry.find('atom:link', ns)
            link = link_el.attrib.get('href', '') if link_el is not None else ''
            
            content_el = entry.find('atom:content', ns)
            content_html = content_el.text if content_el is not None else ""
            
            # Extract structured updates from HTML content
            updates = parse_html_updates(content_html)
            
            releases.append({
                'title': title,
                'id': id_val,
                'updated': updated,
                'link': link,
                'content_html': content_html,
                'updates': updates
            })
            
        return releases
    except Exception as e:
        app.logger.error(f"Error parsing Atom feed XML: {e}")
        return None

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    if not cache['releases'] or force_refresh:
        app.logger.info("Fetching and parsing release notes live...")
        fresh_data = fetch_releases()
        if fresh_data is not None:
            cache['releases'] = fresh_data
            from datetime import datetime
            cache['last_updated'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        elif not cache['releases']:
            return jsonify({'error': 'Failed to retrieve release notes feed.'}), 500
            
    return jsonify({
        'releases': cache['releases'],
        'last_updated': cache['last_updated']
    })

if __name__ == '__main__':
    # Run the application locally
    app.run(debug=True, port=5000)
