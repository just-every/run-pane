-- Private files share the enquiry custody and erasure boundary. Chunks keep each row bounded.
CREATE TABLE pane_files(id TEXT PRIMARY KEY,message_id TEXT NOT NULL REFERENCES pane_messages(id) ON DELETE CASCADE,name TEXT NOT NULL,type TEXT NOT NULL,size INTEGER NOT NULL,hash TEXT NOT NULL);
CREATE TABLE pane_file_chunks(id TEXT PRIMARY KEY,file_id TEXT NOT NULL REFERENCES pane_files(id) ON DELETE CASCADE,position INTEGER NOT NULL,data TEXT NOT NULL,UNIQUE(file_id,position));
