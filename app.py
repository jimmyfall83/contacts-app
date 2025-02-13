from flask import Flask, request, jsonify
import sqlite3
import base64
import os

app = Flask(__name__)

# Database setup
def get_db():
    db = sqlite3.connect('data/contacts.db')
    db.row_factory = sqlite3.Row
    return db

# Create tables
def init_db():
    with app.app_context():
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

@app.route('/contacts', methods=['GET'])
def get_contacts():
    db = get_db()
    contacts = db.execute('SELECT * FROM contacts').fetchall()
    return jsonify([dict(contact) for contact in contacts])

@app.route('/contacts', methods=['POST'])
def add_contact():
    data = request.form
    image = request.files.get('image')
    image_data = None
    if image:
        image_data = base64.b64encode(image.read()).decode()

    db = get_db()
    cursor = db.execute(
        'INSERT INTO contacts (name, email, phone, image) VALUES (?, ?, ?, ?)',
        (data['name'], data['email'], data['phone'], image_data)
    )
    db.commit()
    
    new_id = cursor.lastrowid
    contact = db.execute('SELECT * FROM contacts WHERE id = ?', (new_id,)).fetchone()
    return jsonify(dict(contact))

@app.route('/contacts/<int:id>', methods=['DELETE'])
def delete_contact(id):
    db = get_db()
    db.execute('DELETE FROM contacts WHERE id = ?', (id,))
    db.commit()
    return jsonify({'message': 'Contact deleted'})

if __name__ == '__main__':
    # Ensure data directory exists
    if not os.path.exists('data'):
        os.makedirs('data')
    init_db()
    app.run(debug=True, port=3000) 