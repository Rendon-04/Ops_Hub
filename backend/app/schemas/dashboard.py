from pydantic import BaseModel

class DashboardSummaryOut(BaseModel):
    total_items: int
    low_stock_count: int
    open_tasks_count: int
