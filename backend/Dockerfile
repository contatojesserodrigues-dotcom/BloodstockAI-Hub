FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app/backend

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

COPY backend/ /app/backend/
COPY shared/ /app/shared/

WORKDIR /app/backend

EXPOSE 8080

CMD ["uvicorn", "inspection_ai.api.main:app", "--host", "0.0.0.0", "--port", "8080"]
