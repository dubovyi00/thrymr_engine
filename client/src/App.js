import Index from './MainMenu';
import AddItem from './AddItem';
import ItemsList from './ItemsList';
import AdminCreateDatabase from './AdminCreateDatabase';
import AdminSignUp from './AdminSignUp';
import SignIn from './SignIn';
import AddExistingItem from './AddExistingItem';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';


function App() {
  return (
    <Router>
    	<Routes>
    	    <Route path="/" element={<ItemsList />} />	  
    	    <Route path="/legacy_menu" element={<Index />} />  
    	    <Route path="/add_item" element={<AddItem />} />	
    	    <Route path="/add_existing_item/:id_item" element={<AddExistingItem />} />
    	 
    	      <Route path="/items" element={<ItemsList />} />
    	    <Route path="/items/page/:page" element={<ItemsList />} />
    	    <Route path="/items/category/:id_cat/page/:page" element={<ItemsList />} />	
    	    <Route path="/items/name/:name/page/:page" element={<ItemsList />} />	
    	    <Route path="/admin/dbcreate" element={<AdminCreateDatabase />} />
    	    <Route path="/admin/sign_up" element={<AdminSignUp />} />
    	    <Route path="/sign_in" element={<SignIn />} />
    	    
    	</Routes>
    </Router>
  );
}

export default App;


