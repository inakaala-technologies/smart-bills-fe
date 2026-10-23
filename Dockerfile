FROM nginx:1.27-alpine

COPY dist/ /usr/share/nginx/html/
COPY nginx/react-nginx-container.conf /etc/nginx/conf.d/default.conf
