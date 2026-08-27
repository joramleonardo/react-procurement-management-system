import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { UserInfo } from '@/components/user-info';
import { UserMenuContent } from '@/components/user-menu-content';
import { useIsMobile } from '@/hooks/use-mobile';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { ChevronsUpDown } from 'lucide-react';

export function NavUser() {
    const { auth } =
        usePage<SharedData>().props;

    const { state } =
        useSidebar();

    const isMobile =
        useIsMobile();

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger
                        asChild
                    >
                        <SidebarMenuButton
                            size="lg"
                            className="
                                min-h-14
                                rounded-xl
                                border
                                border-sidebar-border
                                bg-sidebar-accent/40
                                px-3
                                text-sidebar-foreground
                                hover:bg-sidebar-accent
                                hover:text-sidebar-accent-foreground
                                data-[state=open]:bg-sidebar-accent
                                data-[state=open]:text-sidebar-accent-foreground
                            "
                        >
                            <UserInfo
                                user={
                                    auth.user
                                }
                            />

                            <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-60" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-60 rounded-xl border shadow-lg"
                        align="end"
                        side={
                            isMobile
                                ? 'bottom'
                                : state ===
                                    'collapsed'
                                  ? 'left'
                                  : 'bottom'
                        }
                        sideOffset={8}
                    >
                        <UserMenuContent
                            user={
                                auth.user
                            }
                        />
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
