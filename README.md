# News Article Clustering Dashboard

An end-to-end data processing and visualization application that applies Natural Language Processing (NLP) and K-Means clustering to discover thematic relationships within news articles.

This repository features a clean separation between the backend analytical API and a distinct, intuitive React frontend.

---

## 🎯 Features

- **Automated NLP Clustering:** Leverages analytical data handling to categorize news headlines into specialized global topics such as "Sports & Athletics", "World & Mixed", and "Global News & Politics".
- **Analytical Metrics:** Uses customized TF-IDF heuristics to dynamically extract the most distinctive keywords synonymous with each core cluster.
- **RESTful Flask Backend:** Exposes comprehensive analytical statistics including top authors, timeline trends, cluster/category intersections, and a paginated full-text search list of articles.
- **Modern React Dashboard:** Built natively with Vite and React to dynamically ingest JSON and visually surface dataset trends with zero latency.

---

## 🏗️ Architecture Stack

The codebase is split into two cleanly decoupled stacks:

```text
.
├── backend/
│   ├── app.py                 # Core Flask server and API endpoints
│   ├── clustered_data.csv     # Local Dataset containing K-Means output
│   └── venv/                  # Python Virtual Environment
├── frontend/
│   ├── public/                # Generic static assets
│   ├── src/                   # React web components
│   ├── index.html             # Vite HTML mounting entry point
│   └── vite.config.js         # Build tooling configuration
└── README.md                  # Detailed overview
```

---

## 🚀 Local Development Setup

To test the application locally, you will need to simultaneously start both the Flask API server and the Vite Dev server. 

### Prerequisites

- **Node.js & npm** (v18+ recommended)
- **Python** 3.9+ 

### 1️⃣ Setting up the Backend Data API

The backend loads the CSV matrix via `pandas` into memory and serves it over port `:5050`.

1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Set up and activate your virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install the API prerequisites:
   ```bash
   pip install flask pandas flask-cors
   ```
4. Start the underlying data server:
   ```bash
   python app.py
   ```
   > **Note:** The core 400MB `clustered_data.csv` model output sits locally inside the `/backend/` space. It is strictly configured not to track under Git via `.gitignore` to prevent repository bloat.

### 2️⃣ Setting up the Frontend Workspace

The frontend fetches its data asynchronously.

1. Open a **new, split terminal tab** and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install the web dependencies:
   ```bash
   npm install
   ```
3. Boot the Vite hot-reloading development server:
   ```bash
   npm run dev
   ```

You can click the `localhost` hyperlink generated in your terminal to view the resulting dashboard directly inside your browser!

---

## 📡 Core API Reference

The backend operates via two powerful core data pipelines:

- `GET /cluster-info`: Fetches aggregate top-level dashboard statistics map, resolving pre-computed timelines, cross-category density metrics, and dynamically extracted keywords for the whole dataset.
- `GET /data`: Dispatches paginated batches of articles, supporting query parameters like `cluster` indexing, `q` text-filtering over headlines, and robust chronological `from`/`to` scoping features.
