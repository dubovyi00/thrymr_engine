#!/usr/bin/env python
# -*- coding: utf-8 -*-
from flask import Flask, request, jsonify
import psycopg2 
from psycopg2 import sql
from flask_cors import CORS, cross_origin
from math import ceil, floor
from urllib.parse import unquote
import hashlib
import jwt
from datetime import datetime, timedelta

import db
import robot

app = Flask(__name__)
CORS(app, supports_credentials=True)
app.config['SECRET_KEY'] = 'secret'
app.config['CORS_HEADERS'] = 'Content-Type'
db_conn = db.database_connection()
thr = robot.Robot()

# Тестовое подключение к роботу
@app.route('/api/Radd')
def socket_test():
	res = thr.set_value('R', 130, 70)
	
	if res == 400 or res == 500 or res != 200:
		rez = {}
		rez["msg"] = "Connection error"
		resp = jsonify(rez)
		resp.status_code = 502
		
	elif res == 200:
		rez = {}
		rez["msg"] = "Ну, думаю,  и так видно"
		resp = jsonify(rez)
		resp.status_code = 200

	return resp

# --------------- Работа с действиями робота ------------------




@app.route('/api/v1/robot/', methods=['POST', 'DELETE'])
def robot():
	rez = {}
	
	# Запроса на постановку роботом предмета
	if request.method == 'POST':		
		'''
		Поля запроса:
		* id_rack - номер ячейки
		'''
		req = request.get_json(force=True)
		id_rack = req['id_rack']
		
		# Открытие транзакции
		cur = db_conn.cursor()
		
		# Запрос на получение точного расположения ячейки
		query = sql.SQL("SELECT id_rack, row, col FROM rack WHERE id_rack = %s")
		cur.execute(query, [id_rack])
		rack = cur.fetchone()
		row, col = rack[1:3:]
		
		# Закрытие транзакции
		db_conn.commit()
		cur.close()
		
		# Подача команд роботу на погрузку предмета на склад
		rb = thr.put_item(row, col)
			
		if rb == 200:
			rez["msg"] = "OK"
		else:
			rez["msg"] = "Robot error!"
		
		resp = jsonify(rez)
		resp.status_code = rb
		
	# Запроса на взятие роботом предмета
	elif request.method == 'DELETE':
		'''
		Поля запроса:
		* id_rack - номер ячейки
		'''
		req = request.get_json(force=True)
		id_rack = req['id_rack']
		
		# Открытие транзакции
		cur = db_conn.cursor()
		
		# Запрос на получение точного расположения ячейки
		query = sql.SQL("SELECT id_rack, row, col FROM rack WHERE id_rack = %s")
		cur.execute(query, [id_rack])
		rack = cur.fetchone()
		row, col = rack[1:3:]
		
		# Закрытие транзакции
		db_conn.commit()
		cur.close()
		
		# Подача команд роботу на взятие предмета со склада
		rb = thr.take_item(row, col)
			
		if rb == 200:
			rez["msg"] = "OK"
		else:
			rez["msg"] = "Robot error!"
		
		resp = jsonify(rez)
		resp.status_code = rb
	
	return resp


# --------------- Работа с хранилищами ------------------------

# Развёртывание базы данных
def db_create(rows, columns, max_count, password):	
	# Открытие транзакции
	print("Готовимся")
	db_conn.autocommit = True
	cur = db_conn.cursor()
	
	print("Поехали")
	# Проверка на наличие хотя бы одной таблицы в БД - при выполнении данной функции создаются все необходимые, либо, в случае ошибки, не создаются вообще
	query = sql.SQL("SELECT table_name FROM information_schema.tables WHERE table_schema NOT IN ('information_schema','pg_catalog')")
	cur.execute(query, [])
	res = cur.fetchall()
	print("Получили")
	
	tables = [table[0] for table in res]
	
	print(res)
	
	if ("categories" not in tables) and ("items" not in tables) and ("rack" not in tables) and ("pack" not in tables) and ("users" not in tables) and ("history" not in tables): 
		try:
			# Создание таблицы категорий
			query = sql.SQL("CREATE TABLE categories (id_cat serial, name varchar(25) NOT NULL, PRIMARY KEY (id_cat) )")
			cur.execute(query)
			print("+ categories")
			
			# Создание таблицы предметов
			query = sql.SQL("""CREATE TABLE items (
					    id_item serial,
					    name varchar(40) NOT NULL,
					    manufacter varchar(30) NOT NULL,
					    id_cat integer NOT NULL,
					    image text,
					    PRIMARY KEY (id_item) )""")
					    # FOREIGN KEY (id_cat) REFERENCES categories(id_cat) ON DELETE CASCADE )""")
			cur.execute(query)
			
			# Привязка по внешнему ключу таблицы предметов с таблицей категорий
			query = sql.SQL("""ALTER TABLE items 
					    ADD CONSTRAINT category_item
					    FOREIGN KEY (id_cat) 
					    REFERENCES categories(id_cat) ON DELETE CASCADE """)
			cur.execute(query)
			print("+ items")
			
			# Создание таблицы информации об ячейках
			query = sql.SQL("""CREATE TABLE rack (
					    id_rack serial,
					    storage smallint NOT NULL,
					    "row" smallint NOT NULL,
					    col smallint NOT NULL,
					    count integer NOT NULL,
					    max_count integer NOT NULL, 
					    PRIMARY KEY (id_rack) )""")
			cur.execute(query)
			print("+ rack")
			
			# Добавление записи с информацией о каждой заданной ячейке
			for row in range(1, rows+1):
				for col in range(1, columns+1):
					query = sql.SQL("""INSERT INTO rack (storage, row, col, count, max_count) VALUES (1, %s, %s, 0, %s)""")
					cur.execute(query, [row, col, max_count])
			print("+ rack queries")
			
			# Создание таблицы об упаковках
			query = sql.SQL("""CREATE TABLE pack (
					    id_pack serial,
					    id_item integer NOT NULL,
					    id_rack integer NOT NULL,
					    count numeric NOT NULL,
					    measure varchar(4) NOT NULL,
					    package varchar(15) NOT NULL,
					    PRIMARY KEY (id_pack) )""")
					    #FOREIGN KEY (id_item) REFERENCES public.items(id_item) ON DELETE CASCADE,
					    #FOREIGN KEY (id_rack) REFERENCES public.rack(id_rack) )""")
			cur.execute(query)
			# Привязка по внешнему ключу таблицы об упаковках с таблицей предметов
			query = sql.SQL("""ALTER TABLE pack 
					    ADD CONSTRAINT pack_item
					    FOREIGN KEY (id_item) 
					    REFERENCES items(id_item) ON DELETE CASCADE """)
			cur.execute(query)
			# Привязка по внешнему ключу таблицы об упаковках с таблицей информации об ячейках
			query = sql.SQL("""ALTER TABLE pack 
					    ADD CONSTRAINT pack_rack
					    FOREIGN KEY (id_rack) 
					    REFERENCES rack(id_rack) ON DELETE CASCADE """)
			cur.execute(query)
			print("+ pack")
			
			# Создание таблицы пользователей
			query = sql.SQL("""CREATE TABLE users (
					    id_usr serial,
					    login varchar(30) NOT NULL,
					    password varchar(96) NOT NULL, 
					    PRIMARY KEY (id_usr))""")
			cur.execute(query)
			# Добавление записи о данных администратора
			query = sql.SQL("""INSERT INTO users (login, password) VALUES ('admin', %s)""")
			cur.execute(query, [str(hashlib.sha384(bytes(password, encoding = "utf-8")).hexdigest())])
			print("+ users")
			
			
			# Создание таблицы с журналом изменений на складе
			query = sql.SQL("""CREATE TABLE history (
					    id_op serial,
					    id_usr integer NOT NULL,
					    id_item integer NOT NULL,
					    operation varchar(50),
					    datetime timestamp with time zone,
					    PRIMARY KEY (id_op))
					""")
			cur.execute(query)
			# Привязка по внешнему ключу таблицы с журналом изменений на складе с таблицей пользователей
			query = sql.SQL("""ALTER TABLE history 
					    ADD CONSTRAINT history_user
					    FOREIGN KEY (id_usr) 
					    REFERENCES users(id_usr) ON DELETE CASCADE """)
			cur.execute(query)
			# Привязка по внешнему ключу таблицы с журналом изменений на складе с таблицей предметов
			query = sql.SQL("""ALTER TABLE history 
					    ADD CONSTRAINT history_items
					    FOREIGN KEY (id_item) 
					    REFERENCES items(id_item) ON DELETE CASCADE """)
			cur.execute(query)
			print("+ history")
			
			
			
		except (Exception, psycopg2.DatabaseError) as e:
			# Откат изменений в случае возникновения ошибок
			db_conn.rollback()
			cur.close()
			rez = {}
			rez["msg"] = res
			resp = jsonify(rez)
			resp.status_code = 400
		else:
			# Закрытие транзакции и сохранение всех изменений в случае отсутствия ошибок		
			db_conn.commit()
			cur.close()
			rez = {}
			rez["msg"] = "Created"
			resp = jsonify(rez)
			resp.status_code = 201
	else:
		# Если данные таблицы уже есть в БД
		db_conn.commit()
		cur.close()
		rez = {}
		rez["msg"] = "Already exists"
		resp = jsonify(rez)
		resp.status_code = 200
	
	
	return resp


# Проверка развертывания
def db_check():
	# Открытие транзакции
	print("Готовимся")
	db_conn.autocommit = True
	cur = db_conn.cursor()
	
	print("Поехали")
	# Проверка на наличие хотя бы одной таблицы в БД - при выполнении данной функции создаются все необходимые, либо, в случае ошибки, не создаются вообще
	query = sql.SQL("SELECT table_name FROM information_schema.tables WHERE table_schema NOT IN ('information_schema','pg_catalog')")
	cur.execute(query, [])
	res = cur.fetchall()
	print("Получили")
	
	tables = [table[0] for table in res]
	
	print(res)
	
	rez = {}
	resp = jsonify(rez)
	
	# Если нет таблиц в БД - значит БД ещё не создана 
	if ("categories" not in tables) and ("items" not in tables) and ("rack" not in tables) and ("pack" not in tables) and ("users" not in tables) and ("history" not in tables): 
		resp.status_code = 404
	# Если все таблицы есть - нужды в пересоздании БД нет
	else:
		resp.status_code = 200
	
	return resp

# Работа с хранилищами
@app.route('/api/v1/storage/', methods=['POST', 'GET'])
def storage():
	rez = {}
	resp = jsonify(rez)
	
	# Выполнение запроса на инициализацию БД
	if request.method == 'POST':
		'''
	
		Поля запроса:
		* rows - наименование предмета
		* columns - категория предмета
		
		'''
		req = request.get_json(force=True)
		rows = req['rows']
		columns = req['columns']
		max_count = req['max_count']
		password = req['password']
		return db_create(rows, columns, max_count, password)
	# Выполнение запроса на проверку с инициализации БД
	elif request.method == 'GET':
		return db_check()


# Вычисление места и списка ячеек для добавления предмета		
@app.route('/api/v1/storage/free_space/<int:num_packs>', methods=['GET'])
def measure_storage(num_packs):
	errcode = 0
	
	try:
		# Открытие транзакции
		db_conn.autocommit = False
		cur = db_conn.cursor()
		
		needed_racks = []
		
		# Получение данных об ячейках 
		query = sql.SQL("SELECT id_rack, row, col, count, max_count AS count FROM rack ORDER BY id_rack")
		cur.execute(query)
		racks = cur.fetchall()
		rck = []
		for rack in racks:
			rck.append(list(rack))
		
		
		# Вычисление свободного места на полках и определение ячейки для хранения
		for _ in range(num_packs):
			found_just_now = False
			for rack in rck:
				if rack[3] + 1 <= rack[4]:
					id_rack, r, c = rack[:3:]
					needed_racks.append({ "id_rack": id_rack, "row": r, "col": c })
					rck[id_rack-1][3] += 1
					found_just_now = True
					break
			if rack[0] == len(racks) and rack[3] == rack[4] and not found_just_now:
				needed_racks.append({ "id_rack": -1, "row": -1, "col": -1 })
				
	
		
	except (Exception, psycopg2.DatabaseError) as e:
		# Откат изменений в случае возникновения ошибок
		db_conn.rollback()
		cur.close()
		rez = {}
		rez["msg"] = "Error"
		rez["code"] = errcode
		if e.pgerror == None:
			rez["error"] = str(e)
		else:
			rez["error"] = e.pgerror
		resp = jsonify(rez)
		resp.status_code = 400

	else:
		# Закрытие транзакции и сохранение всех изменений в случае отсутствия ошибок		
		db_conn.commit()
		cur.close()
		rez = {}
		rez["racks"] = needed_racks
		rez["msg"] = "OK"
		resp = jsonify(rez)
		resp.status_code = 200
		
	return resp

# RESTful API для хранилищ (pt. 3, получение номера ячейки где лежит упаковка)		
@app.route('/api/v1/storage/pack_rack/<int:id_pack>', methods=['GET'])
def pack_rack(id_pack):	
	errcode = 0
	
	try:
		# Открытие транзакции
		db_conn.autocommit = False
		cur = db_conn.cursor()
		
		# Нахождение номера полки, где предмет лежит
		query = sql.SQL("SELECT id_rack, id_pack FROM pack WHERE id_pack = %s")
		cur.execute(query, [id_pack])
		id_rack = cur.fetchone()[0]
		
	except (Exception, psycopg2.DatabaseError) as e:
		# Откат изменений в случае возникновения ошибок
		db_conn.rollback()
		cur.close()
		rez = {}
		rez["msg"] = "Error"
		rez["code"] = errcode
		if e.pgerror == None:
			rez["error"] = str(e)
		else:
			rez["error"] = e.pgerror
		resp = jsonify(rez)
		resp.status_code = 400

	else:
		# Закрытие транзакции и сохранение всех изменений в случае отсутствия ошибок		
		db_conn.commit()
		cur.close()
		rez = {}
		rez["id_rack"] = id_rack
		rez["msg"] = "OK"
		resp = jsonify(rez)
		resp.status_code = 200
		
	return resp

# --------------- Работа с учётными записями ------------------------

# Регистрация пользователя
def sign_up(login, password, jwt=None):
	errcode = 0
	inner_err_msg = ""
	
	try:
		# Открытие транзакции
		db_conn.autocommit = False
		cur = db_conn.cursor()
		
		# Проверка наличия пользователя с таким логином
		query = sql.SQL("SELECT id_usr FROM users WHERE login=%s")
		cur.execute(query, [login])
		errcode = 1
		res = cur.fetchone()
		print(res)
		
		# Если такого пользователя нет - сохранить данные о нём
		if res == None:
			# Получение контрольной суммы пароля
			pass_hash = str(hashlib.sha384(bytes(password, encoding = "utf-8")).hexdigest())
			query = sql.SQL("INSERT INTO users (login, password) VALUES (%s, %s) RETURNING id_usr")
			errcode = 2
			res = cur.execute(query, [login, pass_hash])
			id_usr = cur.fetchone()[0]
			print(id_usr)	
		# Если такой пользователь есть - даём сигнал на закрытие транзакции
		else:
			inner_err_msg = "Пользователь с таким логином уже существует"
			raise Exception
	
	except (Exception, psycopg2.DatabaseError) as e:
		# Откат изменений в случае возникновения ошибок
		db_conn.rollback()
		cur.close()
		rez = {}
		rez["msg"] = "Error"
		rez["code"] = errcode
		"""if e.pgerror != None:
			rez["error"] = "Postgres error" + e.pgerror
		"""
		if inner_err_msg != "":
			rez["error"] = inner_err_msg
		else:
			rez["error"] = "Postgres error"
			
		resp = jsonify(rez)
		resp.status_code = 400
	
	else:
		# Закрытие транзакции и сохранение всех изменений в случае отсутствия ошибок		
		db_conn.commit()
		cur.close()
		rez = {}
		resp = jsonify(rez)
		resp.status_code = 200
	
	return resp
	

# Аутентификация пользователя
def sign_in(login, password):
	errcode = 0
	inner_err_msg = ""
	
	try:
		# Открытие транзакции
		db_conn.autocommit = False
		cur = db_conn.cursor()
		
		# Проверка наличия пользователя с таким логином
		pass_hash = str(hashlib.sha384(bytes(password, encoding = "utf-8")).hexdigest())
		query = sql.SQL("SELECT id_usr FROM users WHERE login=%s AND password=%s")
		cur.execute(query, [login, pass_hash])
		errcode = 1
		res = cur.fetchone()
		print(res)
		
		# Если пользователь не зарегистрирован - считаем, что данные введены неверно
		if res == None:
			
			inner_err_msg = "Неверный логин/пароль"
			raise Exception	
		# Если пользователь зарегистрирован - формируем JWT-токен
		else:
			errcode = 2
			id_usr = res[0]
			expires = datetime.now() + timedelta(seconds=900)
			access_token = jwt.encode({"login": login, 
						    "admin": True if login == "admin" else False, 
						    "exp": expires}, "secret_key_super_secret", algorithm="HS256")
			
	
	except (Exception, psycopg2.DatabaseError) as e:
		# Откат изменений в случае возникновения ошибок
		db_conn.rollback()
		cur.close()
		rez = {}
		rez["msg"] = "Error"
		rez["code"] = errcode
		"""if e.pgerror != None:
			rez["error"] = "Postgres error" + e.pgerror
		"""
		print(e)
		if inner_err_msg != "":
			rez["error"] = inner_err_msg
		else:
			rez["error"] = "Postgres error"
			
		resp = jsonify(rez)
		resp.status_code = 400
	
	else:
		# Закрытие транзакции и отправка токенов	
		db_conn.commit()
		cur.close()
		rez = {}
		rez["access_token"] = access_token
		
		resp = jsonify(rez)
		resp.set_cookie("access_token", value=access_token, expires=expires, httponly=True, samesite="Lax")
		resp.status_code = 200
	
	return resp
	# return "Аутентификация пользователя"


# RESTful API для учётных записей
@app.route('/api/v1/users/', methods=['GET', 'POST'])
def users():
	rez = {}
	resp = jsonify(rez)
	
	# Аутентификация
	if request.method == 'GET':
		print(list(request.headers))
		login = request.headers['Login']
		password = request.headers['Password']
		if login != "" and password != "":
			print(login, password)
			return sign_in(login, password)
		else:
			resp.status_code = 400
			return resp
	# Регистрация
	elif request.method == 'POST':
		'''
	
		Поля запроса:
		* login - логин нового пользователя
		* password - пароль нового пользователя
		* jwt - токен администратора (необязателен пока что, но без него вообще не должно лететь)
		
		'''
		token_header = request.headers['Authorization'].replace("Bearer ", "")
		token_cookie = request.cookies.get('access_token')
		auth_res = authorize_api('add_item', token_header, token_cookie)
		if auth_res[0] == 200:
			req = request.get_json(force=True)
			login = req['login']
			password = req['password']
			# jwt = req['jwt']
			return sign_up(login, password)
		else:
			resp.status_code = auth_res[0]
	
	return resp

# Авторизация для использования клиента
@app.route('/api/v1/users/authorize/<operation>', methods=['GET'])
def authorize(operation):
	resp = jsonify({})
	user_funcs = ('add_item', 'select_item', 'add_existing_item')
	only_admin_funcs = ('db_create', 'sign_up')
	# Читаем оба токена
	token_header = request.headers['Authorization'].replace("Bearer ", "")
	token_cookie = request.cookies.get('access_token')
	# Если токены одинаковы - продолжаем проверку
	if token_header == token_cookie:
		# Декодируем токен
		try:
			payload = jwt.decode(token_header, "secret_key_super_secret", algorithms=["HS256"])
			# В случае непросроченного токена, проверяем права 
			# Если попытка обратиться к функциям админки без соответствующих прав - запретить доступ
			if (not payload["admin"]) and (operation in only_admin_funcs):
				resp.status_code = 403
				return resp
			# Если задана некорректная функция - выдать ошибку
			elif (operation not in user_funcs) and (operation not in only_admin_funcs):
				resp.status_code = 400
				return resp
			# Если всё ОК - разрешаем доступ
			else:
				resp.status_code = 200
				return resp
		# Если истечёт срок годности, будет вызвано исключение - отправляем сигнал для повторной аутентификации
		except jwt.ExpiredSignatureError:
			resp.status_code = 401
			return resp
		
		
	# Если токены не одинаковы - отправляем сигнал для повторной аутентификации	
	else:
		resp.status_code = 401
		return resp

# Авторизация для использования API
def authorize_api(operation, token_header, token_cookie):
	#code = 200
	user_funcs = ('add_item', 'select_item', 'add_existing_item')
	only_admin_funcs = ('db_create', 'sign_up')
	
	if token_header == token_cookie:
		# Декодируем токен
		try:
			payload = jwt.decode(token_header, "secret_key_super_secret", leeway=timedelta(minutes=5), algorithms=["HS256"])
			# В случае непросроченного токена, проверяем права 
			# Если попытка обратиться к функциям админки без соответствующих прав - запретить доступ
			if (not payload["admin"]) and (operation in only_admin_funcs):
				return [403]
			# Если задана некорректная функция - выдать ошибку
			elif (operation not in user_funcs) and (operation not in only_admin_funcs):
				return [400]
			# Если всё ОК - разрешаем доступ
			else:
				return [200, payload["login"]]
		# Если истечёт срок годности, будет вызвано исключение - отправляем сигнал для повторной аутентификации
		except jwt.ExpiredSignatureError:
			return [401]
		
		
	# Если токены не одинаковы - отправляем сигнал для повторной аутентификации	
	else:
		return [401]

# --------------- Работа с предметами ------------------------

# Добавление предмета на склад
#@app.route('/api/add_new_item/', methods=['POST'])
def add_new_item(name, category, manufacter, image, image_url, packs, login):
	print(packs)
	
	errcode = 0
	
	try:
		# Открытие транзакции
		db_conn.autocommit = False
		cur = db_conn.cursor()
		errcode = -2
		
		# Получение ID пользователя
		query = sql.SQL("SELECT id_usr FROM users WHERE login=%s")
		cur.execute(query, [login])
		id_usr = cur.fetchone()[0]
		
		# Проверяем, есть ли в базе данных такая категория
		query = sql.SQL("SELECT id_cat FROM categories WHERE name=%s")
		cur.execute(query, [category])
		errcode = -1
		res = cur.fetchall()
		print(res)
		
		# Если такой категории нет - сохраняем и полученаем её ID
		if len(res) == 0:
			query = sql.SQL("INSERT INTO categories (name) VALUES (%s) RETURNING id_cat")
			res = cur.execute(query, [category])
			id_cat = cur.fetchone()[0]	
		# Если такая категория есть - только полученаем её ID
		else:
			id_cat = res[0]
		print("id_cat: "+str(id_cat))
		errcode = 1
		
		# Сохранение изображения (если есть) в хранилище
		if image != None:
			f = open(image_url.split("/")[3], "w")
			f.write(image)
			f.close()
    				
			
		# Сохранение данных о самом предмете
		query = sql.SQL("INSERT INTO items (name, manufacter, id_cat, image) VALUES (%s, %s, %s, %s) RETURNING id_item")
		cur.execute(query, [name, manufacter, id_cat, image_url.split("/")[3] if image != None else ""])
		id_item = cur.fetchone()[0]
		print("id_item: "+str(id_item))	
		errcode = 2
		
		# Сохранение данных об упаковках и их местонахождении
		for pack in packs:
			count = pack['count']
			measure = pack['measure']
			package = pack['package']
			id_rack = pack['id_rack']
			# Добавление записи в БД о новой упаковке
			query = sql.SQL("INSERT INTO pack (id_item, id_rack, count, measure, package) VALUES (%s, %s, %s, %s, %s) RETURNING id_pack")
			id_pack = cur.execute(query, [id_item, id_rack, count, measure, package])	
			# Обновление информации о заполненности склада
			query = sql.SQL("UPDATE rack SET count = count + 1 WHERE id_rack = %s")
			cur.execute(query, [id_rack])
			# Занесение записи в журнал истории (пока добавляем от имени админа)
			query = sql.SQL("INSERT INTO history (id_usr, id_item, operation, datetime) VALUES (%s, %s, %s, %s)")
			print(datetime)
			cur.execute(query, [id_usr, id_item, "Доставлено: "+package+" ("+str(count)+" "+measure+")", datetime.now()])		
			
	except (Exception, psycopg2.DatabaseError) as e:
		# Откат изменений в случае возникновения ошибок
		db_conn.rollback()
		cur.close()
		rez = {}
		rez["msg"] = "Error"
		rez["code"] = errcode
		if e.pgerror == None:
			rez["error"] = str(e)
		else:
			rez["error"] = e.pgerror
		resp = jsonify(rez)
		resp.status_code = 400
		
	else:
		# Закрытие транзакции и сохранение всех изменений в случае отсутствия ошибок		
		db_conn.commit()
		cur.close()
		rez = {}
		rez["msg"] = "OK"
		resp = jsonify(rez)
		resp.status_code = 200
		
	return resp


# Изменение количества предметов на складе
# @app.route('/api/add_existing_item/', methods=['PUT'])
def add_existing_item(packs, login):
	print(packs)
	
	errcode = 0
	
	try:
		# Открытие транзакции
		db_conn.autocommit = False
		cur = db_conn.cursor()
		errcode = 1
		
		# Получение ID пользователя
		query = sql.SQL("SELECT id_usr FROM users WHERE login=%s")
		cur.execute(query, [login])
		id_usr = cur.fetchone()[0]
		
		# Сохранение данных об упаковках и их местонахождении
		for pack in packs:
			count = pack['count']
			measure = pack['measure']
			package = pack['package']
			id_rack = pack['id_rack']
			id_item = pack['id_item']
			# Добавление записи в БД о новой упаковке
			query = sql.SQL("INSERT INTO pack (id_item, id_rack, count, measure, package) VALUES (%s, %s, %s, %s, %s) RETURNING id_pack")
			id_pack = cur.execute(query, [id_item, id_rack, count, measure, package])	
			errcode = 2
			# Обновление информации о заполненности склада
			query = sql.SQL("UPDATE rack SET count = count + 1 WHERE id_rack = %s")
			cur.execute(query, [id_rack])
			errcode = 3
			# Занесение записи в журнал истории (пока добавляем от имени админа)
			query = sql.SQL("INSERT INTO history (id_usr, id_item, operation, datetime) VALUES (%s, %s, %s, %s)")
			print(datetime)
			cur.execute(query, [id_usr, id_item, "Доставлено: "+package+" ("+str(count)+" "+measure+")", datetime.now()])	
		
		
	except (Exception, psycopg2.DatabaseError) as e:
		# Откат изменений в случае возникновения ошибок
		db_conn.rollback()
		cur.close()
		rez = {}
		rez["msg"] = "Error"
		rez["code"] = errcode
		if e.pgerror == None:
			rez["error"] = str(e)
		else:
			rez["error"] = e.pgerror
		resp = jsonify(rez)
		resp.status_code = 400

	else:
		# Закрытие транзакции и сохранение всех изменений в случае отсутствия ошибок		
		db_conn.commit()
		cur.close()
		rez = {}
		rez["msg"] = "OK"
		resp = jsonify(rez)
		resp.status_code = 200
		
	return resp

# Выбор предмета на складе
# @app.route('/api/choose_item/', methods=['PUT'])
def choose_item(id_pack, login):
	errcode = 0
	
	try:
		# Открытие транзакции
		db_conn.autocommit = False
		cur = db_conn.cursor()
		errcode = 1
		# Получение ID пользователя
		query = sql.SQL("SELECT id_usr FROM users WHERE login=%s")
		cur.execute(query, [login])
		id_usr = cur.fetchone()[0]
		# Получение идентификатора предмета, соответствующего упаковке
		query = sql.SQL("SELECT id_item FROM pack WHERE id_pack=%s")
		cur.execute(query, [id_pack])	
		id_item = cur.fetchone()[0]
		errcode = 2
		# Обновление данных о свободном месте
		query = sql.SQL("UPDATE rack SET count = count - 1 WHERE id_rack = (SELECT id_rack FROM pack WHERE id_pack = %s)")
		cur.execute(query, [id_pack])
		errcode = 3
		# Удаление данных об упаковке
		query = sql.SQL("DELETE FROM pack WHERE id_pack = %s RETURNING *")
		cur.execute(query, [id_pack])
		res = cur.fetchone()
		errcode = 4
		
		# Занесение записи в журнал истории (пока добавляем от имени админа)
		query = sql.SQL("INSERT INTO history (id_usr, id_item, operation, datetime) VALUES (%s, %s, %s, %s)")
		print(datetime)
		cur.execute(query, [id_usr, id_item, "Взято: "+res[5]+" ("+str(res[3])+" "+res[4]+")", datetime.now()])	
		
		
		
	except (Exception, psycopg2.DatabaseError) as e:
		# Откат изменений в случае возникновения ошибок
		db_conn.rollback()
		cur.close()
		print(e)
		rez = {"msg": "Возникла ошибка", "errcode": errcode}
		resp = jsonify(rez)
		resp.status_code = 400
		return resp
	else:
		# Закрытие транзакции и сохранение всех изменений в случае отсутствия ошибок		
		db_conn.commit()
		cur.close()
		rez = {"msg": "OK!"}
		resp = jsonify(rez)
		resp.status_code = 200
		return resp


# RESTful API для предметов
# Создание, изменение и удаление
@app.route('/api/v1/items/', methods=['POST', 'PUT', 'DELETE'])
def items():
	rez = {}
	resp = jsonify(rez)
	
	# Получение токенов из заголовка и cookies
	token_header = request.headers['Authorization'].replace("Bearer ", "")
	token_cookie = request.cookies.get('access_token')
	auth_res = authorize_api('add_item', token_header, token_cookie)
	# Если авторизация пройдена успешно - выполняем нужный запрос
	if auth_res[0] == 200:
		# Запрос на добавление предмета
		if request.method == 'POST':		
			'''
			Поля запроса:
			* name - наименование предмета
			* category - категория предмета
			* manufacter - название предмета
			* image - ссылка на фотографию
			* packs - информация об упаковках (id_pack, id_item, id_rack, count, measure, package)
			'''
			req = request.get_json(force=True)
			name = req['name']
			category = req['category']
			manufacter = req['manufacter']
			image = req['image']
			image_url = req['image_url']
			packs = req['packs']
			return add_new_item(name, category, manufacter, image, image_url, packs, auth_res[1])
		# Запрос на удаление упаковки
		if request.method == 'DELETE':
			'''
			Поля запроса:
			* id_pack - идентификатор упаковки с предметом
			'''
			req = request.get_json(force=True)
			id_pack = req['id_pack']
			return choose_item(id_pack, auth_res[1])
		# Запрос на добавление количества существующего предмета
		if request.method == 'PUT':
			'''
			Поля запроса:
			* packs - информация об упаковках (id_pack, id_item, id_rack, count, measure, package)
			'''
			req = request.get_json(force=True)
			packs = req['packs']
			return add_existing_item(packs, auth_res[1])
	# Если авторизация не пройдена - возвращаем соответствующий код статуса
	else:
		resp.status_code = 401
	
	return resp

# Получение списка страниц
@app.route('/api/v1/items_pages/', methods=['GET'])
@app.route('/api/v1/items_pages/<by>/<qr>', methods=['GET'])
def get_item_pages_count(by=None, qr=None):
	pages_count = 0
	rez = {}
	
	# Открытие транзакции
	cur = db_conn.cursor()
	
	# Получение из базы данных списка 
	if by == None:
		query = sql.SQL("SELECT COUNT(*) FROM items")
		cur.execute(query)
	elif by == "category":
		query = sql.SQL("SELECT COUNT(*) FROM items WHERE id_cat=%s")
		cur.execute(query, [qr])
	elif by == "name":
		query = sql.SQL("SELECT COUNT(*) FROM items WHERE name ILIKE %s")
		cur.execute(query, ['%%%s%%' % qr.replace('+', ' ')])
	# Если неправильно задан признак, по которому ищем - возвращаем код ошибки
	else:
		resp = jsonify(rez)
		resp.status_code = 400
		return resp
	
	pc = cur.fetchone()[0] / 10
	
	# Закрытие транзакции
	db_conn.commit()
	cur.close()
	
	# Возвращение количества страниц 
	rez["pc"] = pc
	rez["pages_count"] = floor(pc) if (ceil(pc) == floor(pc)) else ceil(pc)
	resp = jsonify(rez)
	resp.status_code = 200
	
	return resp
	
# Получение информации о предмете по его идентификатору
@app.route('/api/v1/items/<int:id_item>', methods=['GET'])
def item_by_id(id_item):
	pages_count = 0
	rez = {}
	
	# Открытие транзакции
	cur = db_conn.cursor()
	
	# Получение из базы данных информации о предмете
	query = sql.SQL("SELECT id_item, name, manufacter, id_cat FROM items WHERE id_item=%s")
	cur.execute(query, [id_item])
	res = cur.fetchone()
	
	# Получение из базы названия категории предмета
	query = sql.SQL("SELECT name FROM categories WHERE id_cat=%s")
	cur.execute(query, [res[3]])
	category_name = cur.fetchone()[0]
	
	# Закрытие транзакции
	db_conn.commit()
	cur.close()
	
	# Если предмет найден, отправляем информацию о нём
	if res != None:
		rez["id_item"], rez["name"], rez["manufacter"], rez["id_cat"] = res
		rez["category_name"] = category_name
		resp = jsonify(rez)
		resp.status_code = 200
		return resp
	# Если не найден, отправляем информацию об отсутствии такого предмета
	else:
		resp = jsonify(rez)
		resp.status_code = 404
		return resp
	
	
	
# Получение списка предметов
@app.route('/api/v1/items/page/<int:page>', methods=['GET'])
def get_item_list(page):
	'''
	
	Поля запроса:
	* page - страница (в каждой по 10 предметов)
	
	'''
	
	items = []
	
	# Открытие транзакции
	cur = db_conn.cursor()
	
	# Получение из базы данных списка предметов
	left_constr = 10 * (page - 1) + 1
	right_constr = 10 * page
	query = sql.SQL("SELECT * FROM (SELECT * FROM items ORDER BY id_item) AS t LIMIT 10 OFFSET %s-1")
	cur.execute(query, [left_constr])
	res = cur.fetchall()
	# Формируем данные об упаковках и читаем журнал операций
	for item in res:
		item_info = {'id_item': item[0],
			     'name': item[1],
			     'manufacter': item[2],
			     'image': "",
			     'packs': [],
			     'history': []
			     }
		# Получение изображения из хранилища
		if item[4] != "":
			f = open(item[4], 'r')
			item_info['image'] = f.read()	
			f.close()	
		
		# Получаем данные об упаковках одного предмета
		query = sql.SQL("SELECT * FROM pack WHERE id_item = %s")
		cur.execute(query, [item[0]])
		packs = cur.fetchall()
		for pack in packs:
			item_info['packs'].append({'id_pack': pack[0],
						    'count': pack[3],
						    'measure': pack[4],
						    'package': pack[5]})
		# Получаем данные из журнала использования об одном предмете
		query = sql.SQL("SELECT * FROM history WHERE id_item = %s")
		cur.execute(query, [item[0]])
		history = cur.fetchall()
		for h in history:
			query = sql.SQL("SELECT login FROM users WHERE id_usr= %s")
			cur.execute(query, [h[1]])
			username = cur.fetchone()[0]
			print(h[4])
			item_info['history'].append({'id_op': h[0],
						    'username': username,
						    'operation': h[3],
						    'datetime': h[4].strftime('%H:%M:%S %d.%m.%Y')})
		items.append(item_info)
	
	# Закрытие транзакции
	db_conn.commit()
	cur.close()
	rez = {}
	rez["items"] = items
	resp = jsonify(rez)
	resp.status_code = 200
	
	return resp

# Получение списка категорий
@app.route('/api/v1/items/categories_list/', methods=['GET'])
def get_category_list():
	'''
	
	Поля запроса отсутствуют
	
	'''
	
	categories = []
	
	# Открытие транзакции
	cur = db_conn.cursor()
	
	# Получение из базы данных списка 
	query = sql.SQL("SELECT * FROM categories")
	cur.execute(query)
	res = cur.fetchall()
	for categ in res:
		cat_info = {'id_cat': categ[0],
			     'name': categ[1],
			     }
		categories.append(cat_info)
	
	# Закрытие транзакции
	db_conn.commit()
	cur.close()
	rez = {}
	rez["categories"] = categories
	resp = jsonify(rez)
	resp.status_code = 200
	
	return resp

# Поиск предмета по названию
@app.route('/api/v1/items/by_name/<name>/page/<int:page>', methods=['GET'])
def search_by_name(name, page):
	# Открытие транзакции
	cur = db_conn.cursor()
	
	# Получение из базы данных списка предметов
	left_constr = 10 * (page - 1) + 1
	right_constr = 10 * page
	items = []
	query = sql.SQL("SELECT * FROM (SELECT * FROM items WHERE name ILIKE %s ORDER BY id_item) AS t LIMIT 10 OFFSET %s-1")
	cur.execute(query, ['%%%s%%' % name.replace('+', ' '), left_constr])
	res = cur.fetchall()
	print(res)
	for item in res:
		item_info = {'id_item': item[0],
			     'name': item[1],
			     'manufacter': item[2],
			     'image': "",
			     'packs': [],
			     'history': []
			     }
		# Получение изображения из хранилища
		if item[4] != "":
			f = open(item[4], 'r')
			item_info['image'] = f.read()	
			f.close()	
		
		# Получаем данные об упаковках одного предмета
		query = sql.SQL("SELECT * FROM pack WHERE id_item = %s")
		cur.execute(query, [item[0]])
		packs = cur.fetchall()
		for pack in packs:
			item_info['packs'].append({'id_pack': pack[0],
						    'count': pack[3],
						    'measure': pack[4],
						    'package': pack[5]})
		
		# Получаем данные из журнала использования об одном предмете
		query = sql.SQL("SELECT * FROM history WHERE id_item = %s")
		cur.execute(query, [item[0]])
		history = cur.fetchall()
		for h in history:
			query = sql.SQL("SELECT login FROM users WHERE id_usr= %s")
			cur.execute(query, [h[1]])
			username = cur.fetchone()[0]
			print(h[4])
			item_info['history'].append({'id_op': h[0],
						    'username': username,
						    'operation': h[3],
						    'datetime': h[4].strftime('%H:%M:%S %d.%m.%Y')})
		items.append(item_info)
	
	# Закрытие транзакции
	db_conn.commit()
	cur.close()
	rez = {}
	rez["items"] = items
 
	resp = jsonify(rez)
	resp.status_code = 200
	
	return resp
	# return "Поиск предмета по названию "+name

# Поиск предмета по категории
@app.route('/api/v1/items/by_category/<int:category>/page/<int:page>', methods=['GET'])
def search_by_category(category, page):
	# Открытие транзакции
	cur = db_conn.cursor()
	
	# Получение из базы данных списка предметов
	left_constr = 10 * (page - 1) + 1
	right_constr = 10 * page
	items = []
	query = sql.SQL("SELECT * FROM (SELECT * FROM items WHERE id_cat = %s ORDER BY id_item) AS t LIMIT 10 OFFSET %s-1")
	cur.execute(query, [category, left_constr])
	res = cur.fetchall()
	print(res)
	for item in res:
		item_info = {'id_item': item[0],
			     'name': item[1],
			     'manufacter': item[2],
			     'image': "",
			     'packs': [],
			     'history': []
			     }
		# Получение изображения из хранилища
		if item[4] != "":
			f = open(item[4], 'r')
			item_info['image'] = f.read()	
			f.close()	
		
		# Получаем данные об упаковках одного предмета
		query = sql.SQL("SELECT * FROM pack WHERE id_item = %s")
		cur.execute(query, [item[0]])
		packs = cur.fetchall()
		for pack in packs:
			item_info['packs'].append({'id_pack': pack[0],
						    'count': pack[3],
						    'measure': pack[4],
						    'package': pack[5]})
		
		# Получаем данные из журнала использования об одном предмете
		query = sql.SQL("SELECT * FROM history WHERE id_item = %s")
		cur.execute(query, [item[0]])
		history = cur.fetchall()
		for h in history:
			query = sql.SQL("SELECT login FROM users WHERE id_usr= %s")
			cur.execute(query, [h[1]])
			username = cur.fetchone()[0]
			print(h[4])
			item_info['history'].append({'id_op': h[0],
						    'username': username,
						    'operation': h[3],
						    'datetime': h[4].strftime('%H:%M:%S %d.%m.%Y')})
		items.append(item_info)
	
	# Закрытие транзакции
	db_conn.commit()
	cur.close()
	rez = {}
	rez["items"] = items
 
	resp = jsonify(rez)
	resp.status_code = 200
	
	return resp
	# return "Поиск предмета по названию "+category

if __name__ == '__main__':
	app.run(debug=True, host='0.0.0.0', port=5000)

