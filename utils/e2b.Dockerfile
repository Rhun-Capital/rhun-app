# You can use most Debian-based base images
FROM python:3.10-slim

# Install Node.js
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip3 install --no-cache-dir pandas numpy matplotlib requests seaborn plotly

# Install Node.js dependencies
RUN npm install -g typescript ts-node

# Create workspace
WORKDIR /home/user