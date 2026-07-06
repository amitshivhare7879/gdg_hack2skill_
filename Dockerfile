FROM python:3.12-slim

# Install system dependencies (curl, Node.js, git)
RUN apt-get update && apt-get install -y \
    curl \
    git \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set up user for Hugging Face Spaces
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

# Set up working directory
WORKDIR $HOME/app

# Copy python dependencies and install them
COPY --chown=user backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir --user -r ./backend/requirements.txt

# Copy frontend package files and install
COPY --chown=user frontend/package*.json ./frontend/
RUN cd frontend && npm install

# Copy the rest of the application code
COPY --chown=user backend ./backend
COPY --chown=user frontend ./frontend

# Build the frontend with NEXT_PUBLIC_API_URL set to /api
WORKDIR $HOME/app/frontend
ENV NEXT_PUBLIC_API_URL=/api
RUN npm run build

# Return to root app dir
WORKDIR $HOME/app

# Copy start script
COPY --chown=user start.sh ./start.sh
RUN sed -i 's/\r$//' start.sh && chmod +x start.sh

# Expose port 7860 (Hugging Face default)
EXPOSE 7860

# Run the startup script
CMD ["./start.sh"]
