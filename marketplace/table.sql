CREATE TABLE verymarketchats (
    id SERIAL PRIMARY KEY,
    sender_wallet VARCHAR(42) NOT NULL,
    receiver_wallet VARCHAR(42) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Optional: index for faster retrieval
CREATE INDEX idx_sender_receiver ON verymarketchats(sender_wallet, receiver_wallet);

ALTER TABLE verymarketchats
ADD COLUMN read BOOLEAN DEFAULT false;
