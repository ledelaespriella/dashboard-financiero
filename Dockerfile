# Utilizar imagen oficial ligera de Python
FROM python:3.11-slim

# Evitar que Python escriba archivos .pyc en el disco
ENV PYTHONDONTWRITEBYTECODE 1
# Evitar buffer en stdout/stderr para que los logs salgan inmediatamente
ENV PYTHONUNBUFFERED 1

# Establecer directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema requeridas (opcional pero buena práctica)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias de Python
COPY requirements.txt /app/
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copiar el código del proyecto (excepto lo excluido en .dockerignore si existiese)
COPY . /app/

# Exponer el puerto
EXPOSE 8000

# Comando para ejecutar la aplicación
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
