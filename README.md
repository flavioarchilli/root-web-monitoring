# ROOT web monitoring [![Build status](https://travis-ci.org/alexpearce/root-web-monitoring.svg?branch=modularise)](http://travis-ci.org/alexpearce/root-web-monitoring)

A [Flask](http://flask.pocoo.org/) web application to view [ROOT](http://root.cern.ch/) histograms.

Change here.

Setting the development environment
-----------------------------------

Development is done on an [SLC6](https://www.scientificlinux.org/) virtual machine managed with [Vagrant](http://www.vagrantup.com/).

There are three important groups of file for setting up the machine:

1. The `Vagrantfile` specifies how to create and provision the virtual machine (VM)
2. The `*_provision.sh` files define the provisioning which sets up the VM
3. `setup_webmonitor.sh` is application-specific configuration for running a [Flask](http://flask.pocoo.org/) app, served by [Gunicorn](http://gunicorn.org/), with [Honcho](https://github.com/nickstenning/honcho), a [Foreman](https://github.com/ddollar/foreman) clone, managing the processes.

To initialise the virtual machine, install [VirtualBox](https://www.virtualbox.org/) and [Vagrant](http://docs.vagrantup.com/v2/installation/index.html) and then, inside this directory, run

    vagrant up --provision

and then when prompted to reload, do so with

    vagrant reload --provision

Both of these steps can take some time, upwards of ten minutes.
If it fails to mount shared folder in Linux guest, destroy the vm:

    vagrant destroy
    
then:
    
    vagrant plugin install vagrant-vbguest

If you then want to run the monitoring application, SSH into the VM

    vagrant ssh

and run the `setup_webmonitor.sh` script

    /vagrant/setup_webmonitor.sh

When resuming development, you will need to activate the [virtualenv](http://www.virtualenv.org/), in the VM, to load the appropriate packages 

    workon webmonitor

and then start the server

    cd /vagrant
    honcho start

Then [visit the site](http://localhost:5000/) on your development machine.

By default the `honcho start` command spawns one worker process.
To start multiple workers, say 4, do

    honcho start -c worker=4
