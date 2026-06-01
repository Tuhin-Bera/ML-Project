# Image Classifier - Medicinal Leaf Recognition

## Clone Repository

```bash
git clone https://github.com/Achinta005/ML-Project.git
cd image-classifier
```

## If You Already Have Project Locally (Without Git)

If you already have the project on your local machine and want to merge it with the remote repository:

```bash
cd your-local-project-directory

# Initialize git
git init

# Add remote repository
git remote add origin https://github.com/Achinta005/ML-Project.git

# Fetch the remote repository
git fetch origin main

# Merge remote changes with local files (handles conflicts)
git merge origin/main --allow-unrelated-histories

# If there are conflicts, resolve them manually, then:
git add .
git commit -m "Merge remote repository with local project"

# Optionally, set tracking branch
git branch -u origin/main main
```

## Setup ML Service

```bash
cd ml-service
pip install -r requirements.txt
```

## Setup Web Frontend

```bash
cd ../web
npm i
```

## Run ML Service

```bash
cd ml-service
python -m uvicorn app.main:app --reload --port 8000
```

API available at: `http://localhost:8000`

## Run Web Frontend

```bash
cd web
npm run dev
```

Web available at: `http://localhost:3000`
