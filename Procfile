web: gunicorn webmonitor:wsgi
worker: python -m webmonitor.start_worker
redis: redis-server /usr/local/etc/redis.conf
