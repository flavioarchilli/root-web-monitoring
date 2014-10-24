#!/bin/sh

########################################
# Setup WebMonitor development environment
########################################
# 1. Create a virtualenv for our Python packages
# 2. Install the packages as specified in requirements.txt
# This script should be run as the vagrant user.
########################################

# Source the virtualenvwrapper helpers
# http://stackoverflow.com/a/13112193/596068
source `which virtualenvwrapper.sh`

echo "Setting up the WebMonitor virtualenv"
mkvirtualenv webmonitor
pip install -r /vagrant/requirements.txt
echo "virtualenv setup complete!"
echo "Now start the server with"
echo "  honcho start"
