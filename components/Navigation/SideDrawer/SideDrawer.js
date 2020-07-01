import React from 'react';
import PropTypes from 'prop-types';
import Backdrop from '../../UI/Backdrop/Backdrop';
import NavigationItems from '../NavigationItems/NavigationItems';
import classes from './SideDrawer.scss';

const SideDrawer = props => {
  let attachedClasses;
  if (props.open) {
    attachedClasses = ['sideDrawer', 'open'].join(' ');
  } else {
    attachedClasses = ['sideDrawer', 'close'].join(' ');
  }
  return (
    <>
      <Backdrop show={props.open} handleClicked={props.closed} />
      <nav className={attachedClasses}>
        <NavigationItems />
      </nav>
      <style jsx scoped>{classes}</style>
    </>
  );
};

SideDrawer.propTypes = {
  open: PropTypes.bool.isRequired,
  closed: PropTypes.func.isRequired
};

export default React.memo(SideDrawer);
