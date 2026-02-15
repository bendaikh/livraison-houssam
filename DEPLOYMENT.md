# Deployment Guide

## Production Deployment

This guide covers deploying the Advanced eCommerce Application to a production server.

---

## Prerequisites

- PHP 8.2 or higher
- Composer
- Node.js 18+
- MySQL or PostgreSQL (for production)
- Web server (Nginx/Apache)
- SSL Certificate (recommended)

---

## Server Requirements

### PHP Extensions
- BCMath
- Ctype
- cURL
- DOM
- Fileinfo
- JSON
- Mbstring
- OpenSSL
- PDO
- Tokenizer
- XML
- SQLite3 (or MySQL/PostgreSQL driver)

### Server Configuration
- Memory: 512MB minimum (1GB recommended)
- Disk Space: 500MB minimum
- PHP max_execution_time: 300
- PHP max_upload_size: 20MB

---

## Step 1: Server Setup

### Install Dependencies

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install php8.2 php8.2-cli php8.2-fpm php8.2-mysql php8.2-sqlite3 \
  php8.2-mbstring php8.2-xml php8.2-bcmath php8.2-curl php8.2-zip \
  nodejs npm composer nginx
```

**CentOS/RHEL:**
```bash
sudo yum install php82 php82-cli php82-fpm php82-mysqlnd php82-mbstring \
  php82-xml php82-bcmath php82-curl nodejs npm composer nginx
```

---

## Step 2: Clone and Setup

### 1. Clone Repository
```bash
cd /var/www
git clone <repository-url> ecommerce
cd ecommerce
```

### 2. Set Permissions
```bash
sudo chown -R www-data:www-data /var/www/ecommerce
sudo chmod -R 755 /var/www/ecommerce
sudo chmod -R 775 storage bootstrap/cache
```

### 3. Install Dependencies
```bash
composer install --no-dev --optimize-autoloader
npm install --production
```

---

## Step 3: Environment Configuration

### 1. Create Production Environment File
```bash
cp .env.example .env
nano .env
```

### 2. Configure Environment Variables

```env
APP_NAME="Advanced eCommerce"
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=https://yourdomain.com

LOG_CHANNEL=stack
LOG_LEVEL=error

# Database - MySQL Production
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=ecommerce_db
DB_USERNAME=ecommerce_user
DB_PASSWORD=strong_password_here

# Cache & Sessions
CACHE_STORE=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis

REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

# Mail Configuration
MAIL_MAILER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=your_username
MAIL_PASSWORD=your_password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="noreply@yourdomain.com"
MAIL_FROM_NAME="${APP_NAME}"
```

### 3. Generate Application Key
```bash
php artisan key:generate
```

---

## Step 4: Database Setup

### 1. Create Database
```sql
CREATE DATABASE ecommerce_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'ecommerce_user'@'localhost' IDENTIFIED BY 'strong_password_here';
GRANT ALL PRIVILEGES ON ecommerce_db.* TO 'ecommerce_user'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Run Migrations
```bash
php artisan migrate --force
```

### 3. Seed Initial Data
```bash
php artisan db:seed --force
```

---

## Step 5: Build Assets

### Production Build
```bash
npm run build
```

### Optimize Application
```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
```

---

## Step 6: Web Server Configuration

### Nginx Configuration

Create: `/etc/nginx/sites-available/ecommerce`

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    root /var/www/ecommerce/public;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/your-cert.crt;
    ssl_certificate_key /etc/ssl/private/your-key.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Logging
    access_log /var/log/nginx/ecommerce-access.log;
    error_log /var/log/nginx/ecommerce-error.log;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Index
    index index.php;

    charset utf-8;

    # Laravel Routes
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # PHP-FPM
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # Deny access to sensitive files
    location ~ /\.(?!well-known).* {
        deny all;
    }

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Client max body size
    client_max_body_size 20M;
}
```

### Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/ecommerce /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Apache Configuration (Alternative)

Create: `/etc/apache2/sites-available/ecommerce.conf`

```apache
<VirtualHost *:80>
    ServerName yourdomain.com
    ServerAlias www.yourdomain.com
    Redirect permanent / https://yourdomain.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName yourdomain.com
    ServerAlias www.yourdomain.com
    DocumentRoot /var/www/ecommerce/public

    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/your-cert.crt
    SSLCertificateKeyFile /etc/ssl/private/your-key.key

    <Directory /var/www/ecommerce/public>
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/ecommerce-error.log
    CustomLog ${APACHE_LOG_DIR}/ecommerce-access.log combined
</VirtualHost>
```

---

## Step 7: SSL Certificate (Let's Encrypt)

### Install Certbot
```bash
sudo apt install certbot python3-certbot-nginx
```

### Generate Certificate
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Auto-renewal Test
```bash
sudo certbot renew --dry-run
```

---

## Step 8: Queue Worker Setup

### Create Systemd Service

Create: `/etc/systemd/system/ecommerce-worker.service`

```ini
[Unit]
Description=Advanced eCommerce Queue Worker
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/ecommerce
ExecStart=/usr/bin/php /var/www/ecommerce/artisan queue:work --sleep=3 --tries=3 --max-time=3600
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### Enable and Start Service
```bash
sudo systemctl enable ecommerce-worker
sudo systemctl start ecommerce-worker
sudo systemctl status ecommerce-worker
```

---

## Step 9: Scheduler Setup

### Add to Crontab
```bash
sudo crontab -e -u www-data
```

Add:
```
* * * * * cd /var/www/ecommerce && php artisan schedule:run >> /dev/null 2>&1
```

---

## Step 10: Monitoring & Maintenance

### Setup Log Rotation

Create: `/etc/logrotate.d/ecommerce`

```
/var/www/ecommerce/storage/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
}
```

### Performance Monitoring
```bash
# Monitor Queue
php artisan queue:monitor

# Monitor Failed Jobs
php artisan queue:failed

# Clear Failed Jobs
php artisan queue:flush
```

---

## Step 11: Backup Strategy

### Database Backup Script

Create: `/var/www/scripts/backup-db.sh`

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/ecommerce"
mkdir -p $BACKUP_DIR

# Backup Database
mysqldump -u ecommerce_user -p'strong_password_here' ecommerce_db > $BACKUP_DIR/db_$DATE.sql

# Compress
gzip $BACKUP_DIR/db_$DATE.sql

# Remove backups older than 30 days
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +30 -delete

echo "Backup completed: db_$DATE.sql.gz"
```

### Schedule Backups
```bash
sudo crontab -e
```

Add:
```
0 2 * * * /var/www/scripts/backup-db.sh
```

---

## Step 12: Security Hardening

### 1. Firewall Configuration
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. Fail2Ban Setup
```bash
sudo apt install fail2ban
sudo systemctl enable fail2ban
```

### 3. Disable Directory Listing
Already configured in Nginx/Apache

### 4. Environment File Security
```bash
sudo chmod 600 .env
```

---

## Step 13: Post-Deployment Checklist

- [ ] Database migrations completed
- [ ] Environment variables configured
- [ ] SSL certificate installed
- [ ] Queue worker running
- [ ] Scheduler configured
- [ ] Backup script tested
- [ ] Logs rotating properly
- [ ] Firewall configured
- [ ] Application accessible via HTTPS
- [ ] Admin login working
- [ ] API endpoints responding
- [ ] Stock alerts functioning
- [ ] Email notifications working

---

## Monitoring & Health Checks

### Application Health
```bash
curl https://yourdomain.com/up
```

### Queue Status
```bash
php artisan queue:monitor
```

### Database Connection
```bash
php artisan db:monitor
```

---

## Updating the Application

### Standard Update Process
```bash
cd /var/www/ecommerce

# Maintenance mode
php artisan down

# Pull latest code
git pull origin main

# Update dependencies
composer install --no-dev --optimize-autoloader
npm install --production
npm run build

# Run migrations
php artisan migrate --force

# Clear and cache
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Restart services
sudo systemctl restart ecommerce-worker
sudo systemctl reload php8.2-fpm
sudo systemctl reload nginx

# Exit maintenance mode
php artisan up
```

---

## Troubleshooting

### Common Issues

**500 Error:**
```bash
php artisan config:clear
php artisan cache:clear
sudo chmod -R 775 storage bootstrap/cache
```

**Queue Not Processing:**
```bash
sudo systemctl restart ecommerce-worker
php artisan queue:restart
```

**Database Connection Error:**
- Check credentials in `.env`
- Verify MySQL service is running
- Check firewall rules

---

## Performance Optimization

### Enable OPcache

Edit `/etc/php/8.2/fpm/php.ini`:
```ini
opcache.enable=1
opcache.memory_consumption=256
opcache.max_accelerated_files=20000
opcache.validate_timestamps=0
```

### Redis Cache
```bash
sudo apt install redis-server
sudo systemctl enable redis-server
```

Update `.env`:
```env
CACHE_STORE=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis
```

---

## Support

For deployment support:
- Email: devops@example.com
- Documentation: https://docs.yourdomain.com

---

**Deployment Status**: Production Ready ✅
