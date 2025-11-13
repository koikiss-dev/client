    # Use a Node.js base image for building
    FROM node:lts-alpine as build

    # Set the working directory
    WORKDIR /app

    # Copy package.json and package-lock.json (or yarn.lock)
    COPY package*.json ./

    # Install dependencies
    RUN npm install

    # Copy the rest of the application code
    COPY . .

    # Build the Vite application
    RUN npm run build

    # Use a lightweight Nginx image to serve the static files
    FROM nginx:stable-alpine

    # Copy the built files from the build stage to Nginx's public directory
    COPY --from=build /app/dist /usr/share/nginx/html

    # Expose port 80 (default for Nginx)
    EXPOSE 80

    # Start Nginx
    CMD ["nginx", "-g", "daemon off;"]