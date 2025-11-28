# mehak-mern-10pshine
# Notes App

## Project Overview
A full-stack notes application with user authentication, per-user notes, rich text editing, logging, testing, and a secret dashboard unlocked by a passphrase. Backend uses Node.js and MySQL. Frontend is React.

## Tech Stack
- Node.js (Express)
- React.js
- MySQL / PostgreSQL / MongoDB
- Pino Logger
- Mocha + Chai (backend)
- Jest (frontend)
- SonarQube
- Git

## Features
- User sign up, login, logout  
- Notes per authenticated user  
- Create, edit, delete notes (rich text)  
- Secret dashboard notes unlocked with a passphrase  
- Global exception handling  
- Pino logging  
- Unit tests  

### Clone
```bash
git clone <repo-url>
cd repo
```
### API Endpoints
Auth
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me

### Notes
GET    /api/notes
POST   /api/notes
GET    /api/notes/:id
PUT    /api/notes/:id
DELETE /api/notes/:id

### Secret Dashboard
POST /api/secret/verify     
GET  /api/notes/secret     


## 🚀 Demo & Screenshots

<img width="1227" height="693" alt="signup" src="https://github.com/user-attachments/assets/8e0b70ca-ad4f-4b23-83c1-f04931e0f080" />
<img width="1335" height="694" alt="dash" src="https://github.com/user-attachments/assets/cbedfec6-8c9b-45b6-829b-e3e21103a42d" />
<img width="897" height="688" alt="new note" src="https://github.com/user-attachments/assets/13a46abc-5d1f-43f1-b21f-9277f1171fae" />
<img width="1263" height="687" alt="sec" src="https://github.com/user-attachments/assets/9aaf4e35-57ac-418e-a124-e4087b401c38" />
<img width="1317" height="688" alt="sed" src="https://github.com/user-attachments/assets/a665b868-5c4b-45c0-8d7b-b158b2741b69" />



