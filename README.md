# BigQuery Release Notes Dashboard & Twitter Share Tool

A premium, interactive single-page web application (SPA) built with Python Flask and vanilla front-end technologies (HTML/CSS/JS) to monitor, filter, search, and Tweet official Google Cloud BigQuery release notes.

---

## 🚀 Key Features

* **Real-Time Feed Ingestion**: Connects to the official Google Cloud BigQuery Release Notes XML feed.
* **Granular BeautifulSoup Breakdown**: Slices compound daily release blocks into distinct, itemized updates based on HTML headers (e.g. `Feature`, `Announcement`, `Issue`, `Changed`, `Deprecated`).
* **In-Memory Cache**: Minimizes network latency and API requests, with client support for force-refresh cache bypassing.
* **Glassmorphic UI Design**: Futuristic dark theme styled with radial glowing lights, backdrop filters, and responsive spacing.
* **Live DOM Search & Filter Tags**: Real-time keyword filter input and categorical filter tag pills operating on the update level.
* **Interactive Tweet Composer**: A customized popup modal matching a social post layout that verifies lengths (up to 280 characters), auto-truncates summary descriptions, and triggers Twitter's official Web Intent portal.

---

## 🛠️ Tech Stack

* **Backend**: Python 3.11, Flask
* **HTML Parsing**: BeautifulSoup4 (lxml/html.parser)
* **XML Parsing**: ElementTree
* **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6)
* **Icons**: Inline SVGs

---

## 📂 Project Structure

```text
├── app.py              # Flask server and XML/HTML parsing pipelines
├── requirements.txt    # Application dependencies
├── README.md           # Project documentation
├── templates/
│   └── index.html      # Semantic HTML5 layout and Tweet modal
└── static/
    ├── style.css       # Glassmorphism styling sheets and badge themes
    └── script.js       # Client state controllers and Twitter actions
```

---

## ⚙️ Installation & Launch

### 1. Prerequisite Checks
Ensure you have **Python 3.11** (or compatible version) installed:

```powershell
python --version
```

### 2. Install Dependencies
Run `pip` to install requirements detailed in [requirements.txt](file:///C:/Users/JuanCarlosMontiel/OneDrive%20-%20ELECTRITEL(GoData)/GODATA/DESARROLLO%20DE%20COMPETENCIAS/AI/INTENSE%20AI%20VIBE%20CODING/agy-cli-projects/requirements.txt):

```powershell
pip install -r requirements.txt
```

### 3. Start the Server
Start the Flask local development server:

```powershell
python app.py
```

### 4. Visit the Application
Open your browser and navigate to:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 📝 Documenting Artifacts

Two technical documentation artifacts are saved in the local `.gemini` directory for agent reference:
* **[implementation_plan.md](file:///C:/Users/JuanCarlosMontiel/.gemini/antigravity-cli/brain/eb9276ea-5e44-4bca-a45f-2a83a1180e74/implementation_plan.md)** (System Architecture)
* **[user_guide.md](file:///C:/Users/JuanCarlosMontiel/.gemini/antigravity-cli/brain/eb9276ea-5e44-4bca-a45f-2a83a1180e74/user_guide.md)** (Feature Guide)
