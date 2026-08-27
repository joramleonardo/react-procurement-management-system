import { Breadcrumbs } from '@/components/breadcrumbs';
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { UserMenuContent } from '@/components/user-menu-content';
import { useInitials } from '@/hooks/use-initials';
import {
    type BreadcrumbItem,
    type NavItem,
    type SharedData,
} from '@/types';
import {
    Link,
    usePage,
} from '@inertiajs/react';
import {
    ChevronDown,
    ClipboardList,
    FileText,
    LayoutDashboard,
    Menu,
    ShieldCheck,
    UsersRound,
} from 'lucide-react';

const mobileNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        url: '/dashboard',
        icon: LayoutDashboard,
    },
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
    {
        title: 'User Management',
        url: '/admin/users',
        icon: UsersRound,
    },
];

interface AppHeaderProps {
    breadcrumbs?: BreadcrumbItem[];
}

function isActiveRoute(
    currentUrl: string,
    itemUrl: string,
): boolean {
    const currentPath =
        currentUrl.split('?')[0];

    if (itemUrl === '/dashboard') {
        return (
            currentPath ===
            '/dashboard'
        );
    }

    return (
        currentPath === itemUrl ||
        currentPath.startsWith(
            `${itemUrl}/`,
        )
    );
}

export function AppHeader({
    breadcrumbs = [],
}: AppHeaderProps) {
    const page =
        usePage<SharedData>();

    const { auth } =
        page.props;

    const getInitials =
        useInitials();

    const currentPage =
        breadcrumbs.length > 0
            ? breadcrumbs[
                  breadcrumbs.length -
                      1
              ]?.title
            : 'Procurement Management System';

    return (
        <>
            {/* MAIN APPLICATION BAR */}
            <header className="border-b border-border bg-card">
                <div className="flex h-14 w-full items-center px-4 md:px-6">
                    {/* MOBILE MENU */}
                    <div className="mr-3 lg:hidden">
                        <Sheet>
                            <SheetTrigger
                                asChild
                            >
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-9 border border-transparent hover:border-border hover:bg-secondary"
                                >
                                    <Menu className="size-5" />

                                    <span className="sr-only">
                                        Open
                                        navigation
                                    </span>
                                </Button>
                            </SheetTrigger>

                            <SheetContent
                                side="left"
                                className="flex h-full w-[292px] flex-col border-r border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
                            >
                                <SheetTitle className="sr-only">
                                    Navigation
                                    Menu
                                </SheetTitle>

                                {/* MOBILE BRAND */}
                                <SheetHeader className="border-b border-sidebar-border p-0 text-left">
                                    <Link
                                        href="/dashboard"
                                        className="flex min-h-[84px] items-center gap-3 px-4 py-4"
                                    >
                                        <div className="flex size-11 shrink-0 items-center justify-center border border-sidebar-border bg-sidebar-primary text-white">
                                            <ShieldCheck className="size-5" />
                                        </div>

                                        <div className="min-w-0">
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-xl font-bold tracking-[-0.03em] text-white">
                                                    PMS
                                                </span>

                                                <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/55">
                                                    DOST-STII
                                                </span>
                                            </div>

                                            <div className="mt-1 text-[10px] font-medium uppercase leading-4 tracking-[0.08em] text-sidebar-foreground/65">
                                                Procurement
                                                Management
                                                System
                                            </div>
                                        </div>
                                    </Link>
                                </SheetHeader>

                                {/* MOBILE NAVIGATION */}
                                <nav className="flex-1 overflow-y-auto px-3 py-4">
                                    <div className="mb-2 px-2 text-[9px] font-bold uppercase tracking-[0.16em] text-sidebar-foreground/40">
                                        Navigation
                                    </div>

                                    <div className="space-y-1">
                                        {mobileNavItems.map(
                                            (
                                                item,
                                            ) => {
                                                const active =
                                                    isActiveRoute(
                                                        page.url,
                                                        item.url,
                                                    );

                                                return (
                                                    <Link
                                                        key={
                                                            item.title
                                                        }
                                                        href={
                                                            item.url
                                                        }
                                                        className={`relative flex h-10 items-center gap-3 border-l-[3px] px-3 text-[13px] font-medium transition-colors ${
                                                            active
                                                                ? 'border-sidebar-primary bg-sidebar-primary/15 text-white'
                                                                : 'border-transparent text-sidebar-foreground/70 hover:border-sidebar-foreground/20 hover:bg-sidebar-accent/70 hover:text-white'
                                                        }`}
                                                    >
                                                        {item.icon && (
                                                            <item.icon
                                                                className={`size-[17px] shrink-0 ${
                                                                    active
                                                                        ? 'text-sidebar-primary'
                                                                        : 'text-sidebar-foreground/55'
                                                                }`}
                                                                strokeWidth={
                                                                    active
                                                                        ? 2.2
                                                                        : 1.8
                                                                }
                                                            />
                                                        )}

                                                        <span className="truncate">
                                                            {
                                                                item.title
                                                            }
                                                        </span>

                                                        {active && (
                                                            <span className="ml-auto size-1.5 bg-sidebar-primary" />
                                                        )}
                                                    </Link>
                                                );
                                            },
                                        )}
                                    </div>
                                </nav>

                                {/* MOBILE FOOTER */}
                                <div className="border-t border-sidebar-border px-4 py-3">
                                    <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/40">
                                        Procurement
                                        Management
                                        System
                                    </div>

                                    <div className="mt-1 text-[11px] text-sidebar-foreground/65">
                                        DOST-STII
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>

                    {/* CURRENT WORKSPACE */}
                    <div className="min-w-0">
                        <div className="hidden items-center gap-2 sm:flex">
                            <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-primary">
                                PMS
                            </span>

                            <span className="h-3 w-px bg-border" />

                            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                Workspace
                            </span>
                        </div>

                        <div className="truncate text-sm font-semibold text-foreground sm:mt-0.5">
                            {currentPage}
                        </div>
                    </div>

                    {/* USER AREA */}
                    <div className="ml-auto flex items-center border-l border-border pl-3 md:pl-4">
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                asChild
                            >
                                <Button
                                    variant="ghost"
                                    className="h-10 gap-3 px-2 hover:bg-secondary"
                                >
                                    <Avatar className="size-8 rounded-[3px] border border-border">
                                        <AvatarImage
                                            src={
                                                auth
                                                    .user
                                                    .avatar
                                            }
                                            alt={
                                                auth
                                                    .user
                                                    .name
                                            }
                                            className="rounded-[2px]"
                                        />

                                        <AvatarFallback className="rounded-[2px] bg-primary/10 text-xs font-bold text-primary">
                                            {getInitials(
                                                auth
                                                    .user
                                                    .name,
                                            )}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="hidden min-w-0 max-w-[190px] text-left sm:block">
                                        <div className="truncate text-[13px] font-semibold leading-4">
                                            {
                                                auth
                                                    .user
                                                    .name
                                            }
                                        </div>

                                        <div className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                                            My Account
                                        </div>
                                    </div>

                                    <ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" />
                                </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent
                                className="w-64 rounded-[3px] border-border"
                                align="end"
                            >
                                <UserMenuContent
                                    user={
                                        auth.user
                                    }
                                />
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>

            {/* BREADCRUMB BAR */}
            {breadcrumbs.length > 1 && (
                <div className="border-b border-border bg-secondary/25">
                    <div className="flex min-h-10 w-full items-center px-4 py-2 text-xs text-muted-foreground md:px-6">
                        <Breadcrumbs
                            breadcrumbs={
                                breadcrumbs
                            }
                        />
                    </div>
                </div>
            )}
        </>
    );
}
