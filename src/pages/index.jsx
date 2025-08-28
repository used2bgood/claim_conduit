import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import CreateRequest from "./CreateRequest";

import Requests from "./Requests";

import ClientProfile from "./ClientProfile";

import Tasks from "./Tasks";

import CreateTask from "./CreateTask";

import Settings from "./Settings";

import TaskDetails from "./TaskDetails";

import Archives from "./Archives";

import ClientDirectory from "./ClientDirectory";

import AdminDirectory from "./AdminDirectory";

import UserManagement from "./UserManagement";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Dashboard: Dashboard,
    
    CreateRequest: CreateRequest,
    
    Requests: Requests,
    
    ClientProfile: ClientProfile,
    
    Tasks: Tasks,
    
    CreateTask: CreateTask,
    
    Settings: Settings,
    
    TaskDetails: TaskDetails,
    
    Archives: Archives,
    
    ClientDirectory: ClientDirectory,
    
    AdminDirectory: AdminDirectory,
    
    UserManagement: UserManagement,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Dashboard />} />
                
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/CreateRequest" element={<CreateRequest />} />
                
                <Route path="/Requests" element={<Requests />} />
                
                <Route path="/ClientProfile" element={<ClientProfile />} />
                
                <Route path="/Tasks" element={<Tasks />} />
                
                <Route path="/CreateTask" element={<CreateTask />} />
                
                <Route path="/Settings" element={<Settings />} />
                
                <Route path="/TaskDetails" element={<TaskDetails />} />
                
                <Route path="/Archives" element={<Archives />} />
                
                <Route path="/ClientDirectory" element={<ClientDirectory />} />
                
                <Route path="/AdminDirectory" element={<AdminDirectory />} />
                
                <Route path="/UserManagement" element={<UserManagement />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}