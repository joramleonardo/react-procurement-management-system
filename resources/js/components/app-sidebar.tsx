import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
} from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import {
    ClipboardList,
    FileText,
    LayoutDashboard,
    ShieldCheck,
    UsersRound,
} from 'lucide-react';

const overviewNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        url: '/dashboard',
        icon: LayoutDashboard,
    },
];

const procurementNavItems: NavItem[] = [
    {
        title: 'PPMP',
        url: '/ppmps',
        icon: ClipboardList,
    },
    {
        title: 'Purchase Requests',
        url: '/purchase-requests',
        icon: FileText,
    },
];

const administrationNavItems: NavItem[] = [
    {
        title: 'User Management',
        url: '/admin/users',
        icon: UsersRound,
    },
];

export function AppSidebar() {
    return (
        <Sidebar
            collapsible="icon"
            variant="sidebar"
            className="border-r border-sidebar-border bg-sidebar"
        >
            {/* BRAND */}
            <SidebarHeader className="border-b border-sidebar-border p-0">
                <Link
                    href="/dashboard"
                    prefetch
                    className="group flex min-h-[84px] items-center gap-3 px-4 py-4 transition-colors hover:bg-sidebar-accent/50"
                >
                    {/* BRAND MARK */}
                    <div className="flex size-11 shrink-0 items-center justify-center border border-sidebar-border bg-sidebar-primary text-sidebar-primary-foreground">
                        <ShieldCheck className="size-5" />
                    </div>

                    {/* BRAND TEXT */}
                    <div className="grid min-w-0 flex-1 leading-tight group-data-[collapsible=icon]:hidden">
                        <div className="flex items-baseline gap-2">
                            <span className="text-xl font-bold tracking-[-0.03em] text-white">
                                PMS
                            </span>

                            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/55">
                                DOST-STII
                            </span>
                        </div>

                        <span className="mt-1 max-w-[170px] text-[10px] font-medium uppercase leading-4 tracking-[0.08em] text-sidebar-foreground/65">
                            Procurement Management System
                        </span>
                    </div>
                </Link>
            </SidebarHeader>

            {/* NAVIGATION */}
            <SidebarContent className="py-4">
                <NavMain
                    label="Overview"
                    items={overviewNavItems}
                />

                <NavMain
                    label="Procurement Planning"
                    items={procurementNavItems}
                />

                <NavMain
                    label="Administration"
                    items={administrationNavItems}
                />
            </SidebarContent>

            {/* USER */}
            <SidebarFooter className="border-t border-sidebar-border p-0">
                <div className="px-3 py-3">
                    <NavUser />
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}
