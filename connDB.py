import os

from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

class Database:
    def __init__(self):
        self.supabase: Client = create_client(
            os.environ.get("SUPABASE_URL"),
            os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")
        )

    def insert(self, table, data):
        response = self.supabase.table(table).insert(data).execute()
        return response.data

    def select(self, table, columns=None):
        if columns:
            columns = ", ".join(columns)
        else:
            columns = "*"
        response = self.supabase.table(table).select(columns).execute()
        return response.data

    def update(self, table, row_id, data):
        response = (
            self.supabase
            .table(table)
            .update(data)
            .eq("id", row_id)
            .execute()
        )
        return response.data

    def delete(self, table, row_id):
        response = (
            self.supabase
            .table(table)
            .delete()
            .eq("id", row_id)
            .execute()
        )
        return response.data
