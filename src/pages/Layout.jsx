
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/api/entities";
import { 
  LayoutDashboard, 
  Users, 
  Plus,
  Settings,
  LogOut,
  CheckSquare,
  Archive,
  Wrench 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "New Profile", 
    url: createPageUrl("CreateRequest"),
    icon: Plus,
  },
  {
    title: "Client Directory",
    url: createPageUrl("ClientDirectory"),
    icon: Users,
  },
];

const taskItems = [
  {
    title: "Open Tasks",
    url: createPageUrl("Tasks"),
    icon: CheckSquare,
  },
  {
    title: "Create Task",
    url: createPageUrl("CreateTask"),
    icon: Plus,
  },
];

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = React.useState(null);

  React.useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);
    } catch (error) {
      console.error("Failed to load current user:", error);
    }
  };
  
  const handleLogout = async () => {
    try {
      await User.logout();
      navigate(0); // Force a reload to redirect to login page
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <SidebarProvider>
      <style>{`
        :root {
          --brand-orange: #F47A1F;
          --brand-orange-bright: #FF8C32;
          --brand-orange-dark: #CC5C00;
          --brand-charcoal: #1C1E22;
          --brand-gray-medium: #2A2D31;
          --brand-black: #0E0F11;
          --brand-gray-light: #B4B6B9;
          --brand-white: #FFFFFF;
          --brand-off-white: #EDEDED;
        }
        
        .sidebar-custom {
          background: linear-gradient(180deg, var(--brand-charcoal) 0%, var(--brand-black) 100%);
          border-right: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .sidebar-header-custom {
          background: var(--brand-gray-medium);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .sidebar-menu-button {
          color: var(--brand-off-white);
          transition: all 0.3s ease;
          border-radius: 8px;
          margin-bottom: 4px;
          font-weight: 500;
        }
        
        .sidebar-menu-button:hover {
          background: linear-gradient(90deg, rgba(244, 122, 31, 0.15), rgba(255, 140, 50, 0.15));
          color: var(--brand-orange-bright);
          transform: translateX(4px);
        }
        
        .sidebar-menu-button.active {
          background: linear-gradient(90deg, var(--brand-orange-dark), var(--brand-orange));
          color: white;
          box-shadow: 0 4px 12px rgba(244, 122, 31, 0.3);
        }
        
        .sidebar-group-label {
          color: var(--brand-gray-light);
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .sidebar-footer-custom {
          background: var(--brand-gray-medium);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .user-dropdown-trigger {
          color: var(--brand-off-white);
          transition: all 0.3s ease;
          border-radius: 8px;
          padding: 8px;
        }
        
        .user-dropdown-trigger:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        
        .mobile-header-custom {
          background: var(--brand-charcoal);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .mobile-trigger {
          color: var(--brand-off-white);
          background: var(--brand-gray-medium);
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.3s ease;
        }
        
        .mobile-trigger:hover {
          background: var(--brand-orange);
          color: white;
        }
        
        .main-content {
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        }
        
        .logo-glow {
          filter: drop-shadow(0 0 8px rgba(244, 122, 31, 0.3));
        }
        
        .brand-title {
          color: var(--brand-off-white);
          font-size: 20px;
          font-weight: 700;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
      `}</style>
      
      <div className="min-h-screen flex w-full">
        <Sidebar className="sidebar-custom">
          <SidebarHeader className="sidebar-header-custom p-6">
            <div className="flex items-center gap-3">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/e8595bec2_base44v2Logo.png" 
                alt="Claim Conduit Logo" 
                className="h-10 w-auto logo-glow" 
              />
              <div>
                <h2 className="brand-title">Claim Conduit</h2>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-4">
            <SidebarGroup>
              <SidebarGroupLabel className="sidebar-group-label px-3 py-2">
                Navigation
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`sidebar-menu-button ${
                          location.pathname === item.url 
                            ? 'active' 
                            : ''
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-3 py-2.5">
                          <item.icon className="w-5 h-5" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel className="sidebar-group-label px-3 py-2">
                Tasks
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {taskItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`sidebar-menu-button ${
                          location.pathname === item.url 
                            ? 'active' 
                            : ''
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-3 py-2.5">
                          <item.icon className="w-5 h-5" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="sidebar-footer-custom p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="user-dropdown-trigger cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-white font-semibold text-sm">{currentUser?.full_name?.[0] || 'U'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{currentUser?.full_name || 'Inspector'}</p>
                      <p className="text-xs text-gray-300 truncate">{currentUser?.email || 'user@email.com'}</p>
                    </div>
                  </div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56 mb-2 bg-white border border-gray-200 shadow-xl">
                {currentUser?.role === 'admin' && (
                  <>
                    <DropdownMenuItem asChild className="cursor-pointer hover:bg-orange-50">
                      <Link to={createPageUrl("Settings")}>
                        <Settings className="w-4 h-4 mr-2 text-orange-600" />
                        <span>Settings</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer hover:bg-orange-50">
                      <Link to={createPageUrl("UserManagement")}>
                        <Users className="w-4 h-4 mr-2 text-orange-600" />
                        <span>User Management</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer hover:bg-orange-50">
                      <Link to={createPageUrl("AdminDirectory")}>
                        <Wrench className="w-4 h-4 mr-2 text-orange-600" />
                        <span>Admin Tools</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer hover:bg-orange-50">
                      <Link to={createPageUrl("Archives")}>
                        <Archive className="w-4 h-4 mr-2 text-orange-600" />
                        <span>Archives</span>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer hover:bg-red-50 text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="mobile-header-custom px-6 py-4 md:hidden">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="mobile-trigger p-2 rounded-lg" />
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/e8595bec2_base44v2Logo.png" 
                alt="Claim Conduit Logo" 
                className="h-8 w-auto logo-glow" 
              />
            </div>
          </header>

          <div className="flex-1 overflow-auto main-content">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
