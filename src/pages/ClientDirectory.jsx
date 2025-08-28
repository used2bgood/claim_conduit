
import React, { useState, useEffect, useMemo } from "react";
import { InspectionRequest } from "@/api/entities";
import { StatusOption } from "@/api/entities";
import { User } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Building2, Phone, ExternalLink, Hash, Shield, Search, Filter } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ClientDirectory() {
  const [clients, setClients] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]); // Keep for status badge display
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("all"); // Changed from statusFilter to cityFilter

  // Memoized map for quick color lookup
  const statusColorMap = React.useMemo(() => {
    return statusOptions.reduce((acc, option) => {
      acc[option.label] = `${option.color_bg} ${option.color_text}`;
      return acc;
    }, {});
  }, [statusOptions]);

  // Extract unique cities from client addresses
  const availableCities = useMemo(() => {
    const cities = new Set();
    clients.forEach(client => {
      // Ensure client.latestRequest and property_address exist
      const address = client.latestRequest?.property_address;
      if (address) {
        // Extract city - assume format is "Street, City, State ZIP"
        const addressParts = address.split(',');
        if (addressParts.length >= 2) {
          const city = addressParts[1].trim();
          cities.add(city);
        }
      }
    });
    return Array.from(cities).sort();
  }, [clients]);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setIsLoading(true);
    try {
      // Fetch both requests, the current user, and status options concurrently
      const [requests, user, statuses] = await Promise.all([
        InspectionRequest.list("-updated_date"),
        User.me(),
        StatusOption.filter({ type: 'inspection' })
      ]);

      setStatusOptions(statuses);

      let relevantRequests = requests;
      // Change: If the user is not an admin AND not a manager, filter requests by created_by.
      // Admins and managers will see all requests.
      if (user.role !== 'admin' && !user.is_manager) {
        relevantRequests = requests.filter(request => request.created_by === user.email);
      }

      const clientMap = {};
      relevantRequests.forEach(request => {
        const key = request.client_name;
        if (!clientMap[key]) {
          clientMap[key] = {
            name: request.client_name,
            contact: request.client_contact_number,
            requests: [],
            latestRequest: request // Store the current request as latest for initial display
          };
        }
        // Update latestRequest if the current request is newer (assuming sorted by -updated_date)
        // or if we simply want the first one encountered for display if not explicitly sorting by date for latest
        // For accurate 'latestRequest', the initial `requests` array must be reliably sorted by `updated_date` descending.
        // The `InspectionRequest.list("-updated_date")` ensures this.
        clientMap[key].requests.push(request);
      });

      // Convert to array and sort alphabetically by last name
      const clientsArray = Object.values(clientMap).sort((a, b) => {
        // Extract last name (assume it's the last word in the name)
        const getLastName = (fullName) => {
          const nameParts = fullName.trim().split(' ');
          return nameParts[nameParts.length - 1].toLowerCase();
        };
        
        const lastNameA = getLastName(a.name);
        const lastNameB = getLastName(b.name);
        
        return lastNameA.localeCompare(lastNameB);
      });

      setClients(clientsArray);
    } catch (error) {
      console.error("Error loading clients:", error);
    }
    setIsLoading(false);
  };
  
  const filteredClients = useMemo(() => {
    return clients
      .filter(client => {
        if (cityFilter === "all") return true;
        const address = client.latestRequest?.property_address; // Use optional chaining for safety
        if (!address) return false;
        
        const addressParts = address.split(',');
        if (addressParts.length >= 2) {
          const city = addressParts[1].trim();
          return city === cityFilter;
        }
        return false;
      })
      .filter(client => {
        if (!searchTerm) return true;
        return client.name.toLowerCase().includes(searchTerm.toLowerCase());
      });
  }, [clients, searchTerm, cityFilter]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Client Directory</h1>
          <p className="text-gray-600 mt-1">Browse and manage all client profiles</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              placeholder="Search by client name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-full md:w-48 bg-white">
                <SelectValue placeholder="Filter by city" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {availableCities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading clients...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
              <p className="text-gray-500">Try adjusting your search or filters.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map((client, index) => (
              <Card key={index} className="bg-white shadow-sm border-0 hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{client.name}</CardTitle>
                        <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                          <Phone className="w-3 h-3" />
                          {client.contact}
                        </div>
                      </div>
                    </div>
                    {/* Badge still uses status, hence statusOptions and statusColorMap are kept */}
                    <Badge className={statusColorMap[client.latestRequest?.status] || 'bg-gray-200 text-gray-800'}>
                      {client.latestRequest?.status || 'Unknown'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Property Address:</p>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {client.latestRequest.property_address}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      {client.latestRequest.claim_number && (
                        <div className="flex items-center gap-1.5">
                          <Hash className="w-3.5 h-3.5 text-gray-500" />
                          <div>
                            <p className="text-xs font-medium text-gray-700">Claim #</p>
                            <p className="text-gray-600">{client.latestRequest.claim_number}</p>
                          </div>
                        </div>
                      )}
                      {client.latestRequest.carrier && (
                        <div className="flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-gray-500" />
                          <div>
                            <p className="text-xs font-medium text-gray-700">Carrier</p>
                            <p className="text-gray-600">{client.latestRequest.carrier}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end pt-2">
                      <Link
                        to={createPageUrl(`ClientProfile?client=${encodeURIComponent(client.name)}`)}
                        className="inline-flex"
                      >
                        <Button variant="outline" size="sm" className="gap-2">
                          <ExternalLink className="w-3 h-3" />
                          View Profile
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
