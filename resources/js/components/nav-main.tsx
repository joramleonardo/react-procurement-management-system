import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';

interface NavMainProps {
    items?: NavItem[];
    label?: string;
}

function isActiveRoute(
    currentUrl: string,
    itemUrl: string,
): boolean {
    const currentPath =
        currentUrl.split('?')[0];

    if (itemUrl === '/dashboard') {
        return currentPath === '/dashboard';
    }

    return (
        currentPath === itemUrl ||
        currentPath.startsWith(
            `${itemUrl}/`,
        )
    );
}

export function NavMain({
    items = [],
    label,
}: NavMainProps) {
    const page = usePage();

    return (
        <SidebarGroup className="px-3 py-2">
            {/* SECTION LABEL */}
            {label && (
                <div className="mb-1.5 flex items-center gap-2 px-2">
                    <SidebarGroupLabel className="h-auto shrink-0 p-0 text-[9px] font-bold uppercase tracking-[0.16em] text-sidebar-foreground/45">
                        {label}
                    </SidebarGroupLabel>

                    <div className="h-px flex-1 bg-sidebar-border/60" />
                </div>
            )}

            {/* NAVIGATION ITEMS */}
            <SidebarMenu className="gap-1">
                {items.map((item) => {
                    const active =
                        isActiveRoute(
                            page.url,
                            item.url,
                        );

                    return (
                        <SidebarMenuItem
                            key={item.title}
                        >
                            <SidebarMenuButton
                                asChild
                                isActive={active}
                                className="
                                    group/nav-item
                                    relative
                                    h-10
                                    overflow-hidden
                                    rounded-[2px]
                                    border-l-[3px]
                                    border-transparent
                                    px-3
                                    text-[13px]
                                    font-medium
                                    text-sidebar-foreground/72
                                    transition-colors

                                    hover:border-sidebar-foreground/20
                                    hover:bg-sidebar-accent/70
                                    hover:text-white

                                    data-[active=true]:border-sidebar-primary
                                    data-[active=true]:bg-sidebar-primary/18
                                    data-[active=true]:font-semibold
                                    data-[active=true]:text-white
                                "
                            >
                                <Link
                                    href={item.url}
                                    prefetch
                                    aria-current={
                                        active
                                            ? 'page'
                                            : undefined
                                    }
                                >
                                    {item.icon && (
                                        <item.icon
                                            className={`
                                                size-[17px]
                                                shrink-0
                                                transition-colors
                                                ${
                                                    active
                                                        ? 'text-sidebar-primary'
                                                        : 'text-sidebar-foreground/60 group-hover/nav-item:text-white'
                                                }
                                            `}
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
                                        <span className="ml-auto size-1.5 shrink-0 bg-sidebar-primary" />
                                    )}
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}
