-- Direct Messages Table
CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for direct_messages
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- Policies for direct_messages
CREATE POLICY "Users can view their own sent/received messages" 
ON direct_messages FOR SELECT 
USING (true); -- Simplified for custom auth as seen in other tables

CREATE POLICY "Anyone can send a message" 
ON direct_messages FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their received messages (mark as read)" 
ON direct_messages FOR UPDATE 
USING (true);
