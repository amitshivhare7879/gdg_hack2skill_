---
title: JanVikas AI
emoji: ⚖️
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# JanVikas AI

JanVikas AI is a citizen-facing AI platform designed to receive, categorize, analyze, cluster, and prioritize community complaints (such as pothole issues, street light failures, educational infrastructure gaps, etc.) and generate responses back to citizens.

This repository is configured to be deployed as a **Hugging Face Space** using **Docker**.

---

## How to Deploy to Hugging Face Spaces

Follow these steps to deploy this application to Hugging Face Spaces:

### Step 1: Create a Hugging Face Space
1. Go to [huggingface.co/spaces](https://huggingface.co/spaces) and click **Create new Space**.
2. Set a **Space name** (e.g. `janvikas-ai`).
3. Select **Docker** as the SDK.
4. Select the **Blank** template (or choose any Docker template, since we provide our own `Dockerfile`).
5. Choose **Public** or **Private** visibility.
6. Click **Create Space**.

### Step 2: Configure Space Secrets (Environment Variables)
Since this application relies on Google Gemini for categorizing and clustering, you must set your API key as a Space secret:
1. In your created Space, click on the **Settings** tab.
2. Scroll down to the **Variables and secrets** section.
3. Click **New secret**.
4. Add the following secrets:
   - **Key**: `GEMINI_API_KEY`
   - **Value**: *[Your Gemini API Key]*
   - **Key**: `LLM_API_KEY` *(Optional, backup LLM provider e.g. Groq key)*
   - **Key**: `LLM_BASE_URL` *(Optional)*
   - **Key**: `LLM_MODEL` *(Optional)*

### Step 3: Deploy the Code
You can deploy by pushing this Git repository to the Hugging Face Space repository.

#### Option A: Using the Command Line (Git)
In your terminal, add the Hugging Face Space repository as a new remote and push to it:

1. Add the HF Space remote (replace `username/space-name` with your details):
   ```bash
   git remote add hf https://huggingface.co/spaces/username/space-name
   ```
2. Commit the changes:
   ```bash
   git add .
   git commit -m "Configure Hugging Face Space deployment"
   ```
3. Push to Hugging Face:
   ```bash
   git push -f hf main
   ```
   *(Note: You might need to enter your Hugging Face username and your **Hugging Face Access Token** with Write permissions as the password. You can generate a token in your Hugging Face [Settings > Access Tokens](https://huggingface.co/settings/tokens)).*

---

## Technical Details

The deployment uses a unified multi-process container:
- **Frontend**: Next.js 15 app running on port `7860` (Hugging Face default).
- **Backend**: FastAPI Python app running on port `8000`.
- **Proxying**: Next.js handles proxying for `/api/*` and `/media/*` requests internally to the FastAPI backend using Next.js Rewrites. This eliminates CORS issues and simplifies the routing under a single port.