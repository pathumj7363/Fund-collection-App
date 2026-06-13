FROM node:18-slim

# Install Google Chrome and Puppeteer dependencies (Required for WhatsApp Web JS)
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and install dependencies
COPY backend/package*.json ./backend/
WORKDIR /usr/src/app/backend
RUN npm install

# Copy all backend files
COPY backend/ ./

# Expose the port (Render/Hugging Face requires 7860 or 5000)
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
