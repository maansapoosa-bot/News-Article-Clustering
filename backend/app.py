from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
from collections import Counter
import re

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

CLUSTER_NAMES = {
    0: "Sports & Athletics",
    1: "World & Mixed",
    2: "Global News & Politics"
}

STOPWORDS = {
    'the','and','for','that','with','this','from','have','been','will',
    'are','was','were','has','had','its','not','but','they','their',
    'more','than','into','also','after','about','over','when','what',
    'cnn','says','said','news','year','years','new','first','last',
    'could','would','should','just','like','time','make','made','one',
    'two','three','four','five','six','seven','eight','nine','ten',
    'open','world','wins','attack','star','french','tiger','woods',
    'review','report','show','back','take','gets','amid','after'
}

def extract_distinctive_keywords(df, cluster_id, all_counts, top_n=8):
    sub = df[df["cluster"] == cluster_id]["Headline"].dropna()
    words = []
    for h in sub:
        tokens = re.findall(r"[a-z]{4,}", str(h).lower())
        words.extend([w for w in tokens if w not in STOPWORDS])
    freq = Counter(words)
    scored = {}
    for word, count in freq.items():
        other = sum(all_counts[o].get(word, 0) for o in all_counts if o != cluster_id)
        scored[word] = count / (1 + other * 0.3)
    return sorted(scored, key=scored.get, reverse=True)[:top_n]

print("Loading data...")
import os
import gdown

file_path = os.path.join(os.path.dirname(__file__), "clustered_data.csv")

if not os.path.exists(file_path):
    print("clustered_data.csv not found locally. Downloading from Google Drive...")
    gdrive_id = "1ofVz9-SmtWHskuYHzRpSaiOkwFvvBqGp"
    gdown.download(id=gdrive_id, output=file_path, quiet=False, fuzzy=True)
    print("Download complete.")

df = pd.read_csv(file_path)

print("Pre-computing cluster data...")

cluster_counts = {
    CLUSTER_NAMES.get(int(k), f"Cluster {k}"): int(v)
    for k, v in df["cluster"].value_counts().items()
}

category_counts = {}
if "Category" in df.columns:
    category_counts = df["Category"].fillna("Unknown").value_counts().to_dict()

# Build per-cluster headline word counts first (for TF-IDF scoring)
all_headline_counts = {}
for cid in df["cluster"].dropna().unique():
    sub = df[df["cluster"] == cid]["Headline"].dropna()
    words = []
    for h in sub:
        tokens = re.findall(r"[a-z]{4,}", str(h).lower())
        words.extend([w for w in tokens if w not in STOPWORDS])
    all_headline_counts[int(cid)] = Counter(words)

# Distinctive keywords per cluster
cluster_keywords_map = {}
for cid in df["cluster"].dropna().unique():
    name = CLUSTER_NAMES.get(int(cid), f"Cluster {int(cid)}")
    cluster_keywords_map[name] = extract_distinctive_keywords(df, cid, all_headline_counts)

# Articles over time
timeline_data = []
if "Date published" in df.columns:
    df["_date"] = pd.to_datetime(df["Date published"], errors="coerce")
    df["_month"] = df["_date"].dt.to_period("M").astype(str)
    monthly = df.groupby("_month").size().sort_index()
    timeline_data = [{"month": k, "count": int(v)} for k, v in monthly.items() if k != "NaT"]

# Cluster x Category breakdown
cluster_category_data = []
if "Category" in df.columns:
    df["_cluster_name"] = df["cluster"].map(lambda x: CLUSTER_NAMES.get(int(x), f"Cluster {int(x)}"))
    cc = df.groupby(["_cluster_name", "Category"]).size().unstack(fill_value=0)
    for cluster_name, row in cc.iterrows():
        entry = {"cluster": cluster_name}
        entry.update({cat: int(val) for cat, val in row.items()})
        cluster_category_data.append(entry)

# Top authors
author_data = []
if "Author" in df.columns:
    authors = df["Author"].fillna("").str.strip()
    authors = authors[authors != ""]
    # Some entries have multiple authors like "John, CNN" — take first name part
    authors = authors.map(lambda a: a.split(",")[0].strip())
    author_counts = authors.value_counts().head(10)
    author_data = [{"author": k, "count": int(v)} for k, v in author_counts.items()]

# Stats
total_articles = len(df)
date_min = ""
date_max = ""
avg_per_day = 0
if "Date published" in df.columns:
    valid_dates = df["_date"].dropna()
    if len(valid_dates):
        date_min = str(valid_dates.min().date())
        date_max = str(valid_dates.max().date())
        days = max((valid_dates.max() - valid_dates.min()).days, 1)
        avg_per_day = round(total_articles / days, 1)

@app.route("/cluster-info")
def get_cluster_info():
    return jsonify({
        "counts": cluster_counts,
        "categories": category_counts,
        "keywords": cluster_keywords_map,
        "timeline": timeline_data,
        "clusterCategory": cluster_category_data,
        "authors": author_data,
        "stats": {
            "total": total_articles,
            "dateMin": date_min,
            "dateMax": date_max,
            "avgPerDay": avg_per_day
        },
        "clusterIds": {v: k for k, v in CLUSTER_NAMES.items()}
    })

@app.route("/data")
def get_data():
    try:
        cluster  = request.args.get("cluster", "all")
        query    = request.args.get("q", "").strip().lower()
        sort     = request.args.get("sort", "default")   # default | newest | oldest
        date_from = request.args.get("from", "")
        date_to   = request.args.get("to", "")
        page     = int(request.args.get("page", 1))
        per_page = int(request.args.get("per_page", 20))

        query_df = df.copy()

        # Cluster filter
        if cluster and cluster != "all":
            try:
                query_df = query_df[query_df["cluster"] == int(cluster)]
            except ValueError:
                pass

        # Date range filter
        if date_from:
            query_df = query_df[query_df["_date"] >= pd.to_datetime(date_from, errors="coerce")]
        if date_to:
            query_df = query_df[query_df["_date"] <= pd.to_datetime(date_to, errors="coerce")]

        # Full-text search on headline
        if query:
            mask = query_df["Headline"].fillna("").str.lower().str.contains(query, regex=False)
            query_df = query_df[mask]

        # Sort
        if sort == "newest" and "_date" in query_df.columns:
            query_df = query_df.sort_values("_date", ascending=False)
        elif sort == "oldest" and "_date" in query_df.columns:
            query_df = query_df.sort_values("_date", ascending=True)

        total = len(query_df)

        # Pagination
        start = (page - 1) * per_page
        query_df = query_df.iloc[start:start + per_page]

        cols = ["Headline", "Description", "cluster", "Category", "Section", "Author", "Url", "Date published"]
        cols_present = [c for c in cols if c in df.columns]
        result = query_df[cols_present].fillna("").copy()
        result["cluster"] = result["cluster"].map(
            lambda x: CLUSTER_NAMES.get(int(x), f"Cluster {int(x)}")
        )
        return jsonify({
            "articles": result.to_dict(orient="records"),
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": max(1, -(-total // per_page))  # ceiling division
        })
    except Exception as e:
        print("ERROR:", e)
        return jsonify({"error": str(e)})

if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5050)
