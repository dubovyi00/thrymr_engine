import psycopg2 
from psycopg2 import sql
import os


# Подключение к Бд
def database_connection():
	conn_data = []
	# Чтение данных из файла .env
	with open('.env') as conn_data_file:
		for i in range(3):
			conn_data.append(conn_data_file.readline().split('=')[1])
	# Установление связи с БД
	db_conn = psycopg2.connect(dbname=conn_data[0][:len(conn_data[0])-1], user=conn_data[2][:len(conn_data[2])-1], password=conn_data[1][:len(conn_data[1])-1], host='db', port='5432')
	# Возвращаем идентификатор подключения для дальнейшей работы с БД
	return db_conn

