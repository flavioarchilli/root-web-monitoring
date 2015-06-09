web: gunicorn webmonitor:wsgi
worker: python -m webmonitor.start_worker
redis: redis-server ${VIRTUAL_ENV}/etc/redis.conf
