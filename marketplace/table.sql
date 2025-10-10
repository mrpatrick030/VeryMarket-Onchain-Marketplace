-- Chat Sessions Table
CREATE TABLE verymarket_chat_sessions (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    buyer_wallet VARCHAR(42) NOT NULL,
    seller_wallet VARCHAR(42) NOT NULL,
    mediator_wallet VARCHAR(42),
    mediator_joined BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chat Messages Table
CREATE TABLE verymarketchats (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES verymarket_chat_sessions(id) ON DELETE CASCADE,
    sender_wallet VARCHAR(42) NOT NULL,
    receiver_wallet VARCHAR(42) NOT NULL,
    message TEXT,
    attachment_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read BOOLEAN DEFAULT false
);

CREATE INDEX idx_chat_session ON verymarketchats(session_id);