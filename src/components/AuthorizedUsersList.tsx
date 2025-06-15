
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2, User, UserX } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface UserDescriptor {
  id: string;
  name: string;
  image_url?: string;
  created_at: string;
}

export interface AuthorizedUsersListProps {
  enrolledDescriptors: UserDescriptor[];
  loading: boolean;
  handleDeleteUser: (userId: string, userName: string) => void;
}

const AuthorizedUsersList: React.FC<AuthorizedUsersListProps> = ({
  enrolledDescriptors,
  loading,
  handleDeleteUser,
}) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2">
        <User className="h-5 w-5" />
        Authorized Users ({enrolledDescriptors.length})
      </CardTitle>
      <CardDescription>Manage AI biometric access permissions</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm">Loading authorized users...</span>
          </div>
        ) : enrolledDescriptors.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <UserX className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium mb-1">No Enrolled Users</p>
            <p className="text-xs">Enroll authorized personnel to enable security</p>
          </div>
        ) : (
          enrolledDescriptors.map((user, idx) => (
            <div key={user.id}>
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {user.image_url && (
                    <img
                      src={user.image_url}
                      alt={user.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-background shadow-sm"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Enrolled {new Date(user.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-green-600 font-medium">✓ AI Face Descriptor Active</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteUser(user.id, user.name)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {idx < enrolledDescriptors.length - 1 && <Separator className="my-2" />}
            </div>
          ))
        )}
      </div>
    </CardContent>
  </Card>
);

export default AuthorizedUsersList;

