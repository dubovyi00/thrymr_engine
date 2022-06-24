import socket
import requests
import time
from math import *


class Robot:
	def __init__(self):
		# Заголовки HTTP-запросов для успешной связи с API сервера 
		self.headers = {'Access-Control-Request-Method': 'POST, OPTIONS', 
		                'Access-Control-Request-Headers': 'Origin, X-Requested-With, Content-Type, Accept, User-Agent',
		                'Content-Type': 'application/json'}
		# Z-координаты ячеек
		self.rows = [ 71, 107, 149, 189, 229, 269, 309, 351, 391 ]
	
	# Выполнение запроса для возвращения оси к нулевой координате	
	def home(self, axis):
		url = 'http://ctrl:3006/api/home/'
		payload = {'axis': axis}
		r = requests.post(url, headers=self.headers, json=payload)
		return r.status_code
	
	# Выполнение запроса для изменения координаты оси
	def set_value(self, axis, coord, speed=None):
		url = 'http://ctrl:3006/api/setvalue/'
		if (speed != None):
			payload = {'axis': axis, 'coord': coord, 'speed': speed}
		else:
			payload = {'axis': axis, 'coord': coord}
		r = requests.post(url, headers=self.headers, json=payload)
		return r.status_code
	
	# Выполнение запроса для получения координаты оси
	def get_value(self, axis):
		url = 'http://ctrl:3006/api/getvalue/'+axis
		r = requests.get(url, headers=self.headers)
		return r.json()['values'][2] * 0.002510704
		
	# Выполнение запроса для изменения координаты оси	
	def horizontal_X(self, direction='left'):
		url = 'http://ctrl:3006/api/horizontal/'
		payload = {'dir': direction}
		r = requests.post(url, headers=self.headers, json=payload)
		return r.status_code
	
	# Выполнение запроса для открытия/закрытия хватающей части
	def openclose_X(self, arg):
		url = 'http://ctrl:3006/api/openclose/'
		payload = {'arg': arg}
		r = requests.post(url, headers=self.headers, json=payload)
		return r.status_code 
	
	# Набор команд для взятия предмета	
	def take_item(self, row, column):
		# R поворачивается прямо к ячейкам
		
		self.set_value('R', 22, 77)
		# подъём на нужную высоту 
		self.set_value('Z', self.rows[row-1], 50) # для каждой ячейки вычислить отдельно вообще надо
		time.sleep(5)
		
		# открывается ось захвата 
		self.openclose_X(True)
		# ось захвата движется влево
		self.horizontal_X('left')
		
		time.sleep(2)
		
		# закрыватеся ось захвата 
		self.openclose_X(False)
		time.sleep(1.5)
		# ось захвата движется вправо
		self.horizontal_X('right')
		
		time.sleep(0.5)
		
		# R поворачивается 
		self.set_value('R', 120, 77)
		time.sleep(1)	
		# выдача предмета
		status = self.openclose_X(True)
		
		return status
	
	# Набор команд для взятия предмета		
	def put_item(self, row, column):
		# забор и фиксирование предмета
		self.openclose_X(False)
		time.sleep(1)		
		
		# подъём на нужную высоту (миллиметров на 7 повыше)
		self.set_value('Z', self.rows[row-1] + 11, 50) # заместо для каждой ячейки вычислить отдельно вообще надо
		time.sleep(5)
		# R поворачивается прямо к ячейкам
		self.set_value('R', 22, 77)
		time.sleep(1)
		
		# ось захвата движется влево
		self.horizontal_X('left')
		time.sleep(2)
		# открывается ось захвата 
		self.openclose_X(True)
		time.sleep(0.5)
		# чуть-чуть опуститься (миллиметров на 7 ниже)
		self.set_value('Z', self.rows[row-1]- 60, 50) # заместо для каждой ячейки вычислить отдельно вообще надо
		time.sleep(2)
		# ось захвата движется вправо
		self.horizontal_X('right')
		time.sleep(0.5)
		# R поворачивается на 180 градусов
		self.set_value('R', 120, 77)
		time.sleep(1)	
		# подготовка ко взятию следующего предмета
		status = self.openclose_X(True)
		
		return status
