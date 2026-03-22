# Dashboard Financiero - Plasma Pathfinder 🚀

Una aplicación web robusta orientada al análisis de presupuestos financieros a partir de archivos Excel (`.xlsx`). Diseñado con **Clean Architecture**, soportado por una base de datos relacional y dockerizado para facilitar su despliegue en cualquier entorno de servidor.

![Status](https://img.shields.io/badge/Status-Active-success.svg)
![Python](https://img.shields.io/badge/Python-3.11%2B-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791.svg)

---

## 🌟 Características Principales

- **Dashboard Interactivo**: Visualiza los datos importados mediante gráficos dinámicos e intuitivos construidos sobre Chart.js.
  - *Donut Chart*: Agrupación porcentual por rubro. Funciona como filtro accionable (click-to-filter).
  - *Stacked Bar*: Top 10 Presupuestos ordenados por valor con comparación de costo mes.
  - *Bar Chart*: Top 10 de proveedores principales.
- **Historial Multi-Excel (NUEVO)**: Transición completa de almacenamiento temporal (localStorage) a almacenamiento persistente. Ahora puedes procesar múltiples archivos Excel sin perder tu historial. Un selector en la barra superior te permite cambiar entre diferentes reportes históricos instantáneamente.
- **Procesamiento Eficiente (Backend Agregations)**: Para garantizar velocidad en el navegador web, todo el cálculo matemático, ordenamiento, filtrado y las agrupaciones se despachan desde queries optimizadas de SQL (`GROUP BY`, `SUM()`) en la base de datos hacia una API REST estructurada.
- **Gestión Inteligente de DB**:
  - Eliminación por Cascada: Borrar un reporte eliminará automáticamente los millones de registros crudos vinculados.
  - Fallback a SQLite: En caso de que se implemente en un entorno local sin un servidor PostgreSQL preconfigurado, el sistema generará de forma automática una persistencia en memoria local con `SQLite`.

## 🏗️ Arquitectura (Clean Architecture)

El proyecto adopta un estándar de Clean Architecture, segregando las responsabilidades de código de forma escalable:

```text
plasma-pathfinder/
├── app/
│   ├── api/                    # Routers HTTP (Endpoints)
│   ├── core/                   # Configuraciones e inyección de DB Setup (SQLAlchemy)
│   ├── models/                 # Modelos ORM (Presupuesto, FileMetadata)
│   ├── repositories/           # Patrón repositorio para abstracción de Lógica SQL
│   ├── schemas/                # Schemas de Validación con Pydantic
│   └── services/               # Servicio transaccional (Pandas Parser -> Db Insert)
├── static/                     # Frontend Vanilla JS / CSS Glassmorphism
├── main.py                     # Entrypoint de FastAPI / Uvicorn
├── docker-compose.yml          # Infraestructura Docker
└── Dockerfile                  # Empaquetado del Backend Python
```

## 🛠️ Requisitos e Instalación

### Método 1: Docker Compose (Recomendado para Producción)

Levanta la base de datos y la API sin interrupciones mediante contenedores aislados. Requiere tener [Docker](https://www.docker.com/) instalado.

```bash
docker-compose up -d --build
```
Una vez levantado:
- Aplicación Web: [http://localhost:8000](http://localhost:8000)
- Swagger OpenAPI: [http://localhost:8000/docs](http://localhost:8000/docs)

### Método 2: Despliegue Local (Dev Mode, usando SQLite de Fallback)
Si no tienes Docker puedes utilizar el servidor de desarrollo, el cual automáticamente usará SQLite para la persistencia.

1. **Instala las dependencias:**
   ```bash
   pip install -r requirements.txt
   ```
2. **Levanta el servidor Uvicorn:**
   ```bash
   python main.py
   ```
3. Visita [http://localhost:8000](http://localhost:8000).

---

## 💻 Uso Básico

1. Al abrir la app, te invitará a subir o arrastrar un archivo `.xlsx` (asegúrate de que cumpla con las columnas esperadas: `RUBRO`, `TIPO`, `COSTO MES`, `VALOR`, `PRESUPUESTO`, etc).
2. De forma instantánea obtendrás una vista limpia en un Dashboard oscuro.
3. Arriba a la derecha puedes elegir "Subir Otro", esto apilará un nuevo set de registros a tu historial sin dañar el anterior.
4. Usa el `Selector de Historial de Archivos` de la cabecera para transitar entre cualquier análisis procesado históricamente.
5. Puedes probar el filtro dinámico haciendo clic sobre los bordes del Donut Chart.

## Licencia & Autoría

Desarrollado para Plasma Pathfinder mediante asistencia guiada orientada a arquitecturas corporativas con FastAPI.
