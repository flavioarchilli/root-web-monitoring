Vagrant + Honcho + Gunicorn + Flask
====================================

These files are all that's needed to create an [SLC6](https://www.scientificlinux.org/) development environment with [Vagrant](http://www.vagrantup.com/).
There are three classes of file:

1. The `Vagrantfile` specifies how to create and provision the virtual machine (VM)
2. The `*_provision.sh` files define the provisioning which sets up the VM
3. `setup_velo.sh` is application-specific configuration for running a [Flask](http://flask.pocoo.org/) app, served by [Gunicorn](http://gunicorn.org/), with [Honcho](https://github.com/nickstenning/honcho), a [Foreman](https://github.com/ddollar/foreman) clone, managing the processes.

To initialise the virtual machine, install [VirtualBox](https://www.virtualbox.org/) and [Vagrant](http://docs.vagrantup.com/v2/installation/index.html) and then, inside this directory, run

    vagrant up --provision

and then when prompted to reload, do so with

    vagrant reload --provision

Both of these steps can take some time, upwards of ten minutes.

If you then want to run the VELO web application, SSH into the VM

    vagrant ssh

and run the `setup_velo.sh` script

    /vagrant/setup_velo.sh

When resuming development, you will need to activate the VELO [virtualenv](http://www.virtualenv.org/), in the VM, to load the appropriate packages 

    workon velo

and then start the server

    cd /vagrant/velo
    honcho start

Then [visit the site](http://localhost:5000/) on your development machine.

By default the `honcho start` command spawns one worker process.
To start multiple workers, say 4, do

    honcho start -c worker=4