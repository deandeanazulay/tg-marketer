@@ .. @@
-import { Column, Table } from "drizzle-orm";
-
 // DataStore Interface
 export interface Profile {
   telegram_id: string; // Changed to string to match JWT payload
   username?: string;
   role: 'user' | 'admin';
   created_at: Date;
 }