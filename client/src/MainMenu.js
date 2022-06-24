import './App.css';

function Index() {
  return (
    <div className="window">
      <header>
        <h1>Thrymr</h1>
      </header>
      <div className="menu">
      	<h3>Выберите действие:</h3>
      	<div className="menu-buttons">
      		<a href="/add_item"><button><p>Добавить предмет на склад</p></button></a><br />
      		<a href="/items"><button><p>Выбрать предмет со склада</p></button></a><br />
      		<a href="/admin/dbcreate"><button><p>Инициализировать базу данных</p></button></a>
      	</div>
      </div>
      <footer>
      	<p>Thrymr is a part of M.A.R.S. (Mobile Autonomous Robotic System)<br />
	Thrymr - часть Мобильной Автономной Робототехнической Системы</p>
      </footer>
    </div>
  );
}

export default Index;
