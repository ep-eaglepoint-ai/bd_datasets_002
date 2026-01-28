# import psycopg2
# from pathlib import Path

# def setup_database(connection_string):
#     conn = psycopg2.connect(connection_string)
#     cursor = conn.cursor()
#     sql_file = Path(__file__).parent / "inventory_reservation.sql"
#     sql_content = sql_file.read_text()
#     cursor.execute(sql_content)
#     conn.commit()
#     cursor.close()
#     conn.close()