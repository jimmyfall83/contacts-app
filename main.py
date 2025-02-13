from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3
import base64
import os

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup
def get_db():
    db = sqlite3.connect('data/contacts.db')
    db.row_factory = sqlite3.Row
    return db

class Contact(BaseModel):
    name: str
    email: str
    phone: str
    image: str | None = None

@app.on_event("startup")
def startup():
    # Ensure data directory exists
    if not os.path.exists('data'):
        os.makedirs('data')
    
    # Initialize database
    db = get_db()
    db.execute('''
        CREATE TABLE IF NOT EXISTS contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT NOT NULL,
            image TEXT
        )
    ''')
    db.commit()

@app.get("/contacts")
def get_contacts():
    db = get_db()
    contacts = db.execute('SELECT * FROM contacts').fetchall()
    return [dict(contact) for contact in contacts]

@app.post("/contacts")
async def create_contact(
    name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    image: UploadFile | None = File(None)
):
    image_data = None
    if image:
        contents = await image.read()
        image_data = base64.b64encode(contents).decode()

    db = get_db()
    cursor = db.execute(
        'INSERT INTO contacts (name, email, phone, image) VALUES (?, ?, ?, ?)',
        (name, email, phone, image_data)
    )
    db.commit()
    
    new_id = cursor.lastrowid
    contact = db.execute('SELECT * FROM contacts WHERE id = ?', (new_id,)).fetchone()
    return dict(contact) 