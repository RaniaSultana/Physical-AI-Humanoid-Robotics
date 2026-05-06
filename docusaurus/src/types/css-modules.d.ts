/// <reference types="@docusaurus/module-type-aliases" />
/// <reference types="vite/client" />

declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '@docusaurus/Link' {
  import type { ComponentProps } from 'react';
  type LinkProps = ComponentProps<'a'> & {
    to?: string;
    href?: string;
    isNavLink?: boolean;
    activeClassName?: string;
    exact?: boolean;
  };
  const Link: React.ComponentType<LinkProps>;
  export default Link;
}

declare module '@docusaurus/router' {
  import type { Location } from 'history';

  export function useLocation(): Location;
  export function useHistory(): { push: (path: string) => void; replace: (path: string) => void };
}
