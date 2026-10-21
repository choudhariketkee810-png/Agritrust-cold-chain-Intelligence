import React from 'react';
import Sidebar, { NAVIGATION_SECTIONS } from './Sidebar';

export { NAVIGATION_SECTIONS };

export default function Navigation(props) {
  return <Sidebar {...props} />;
}
