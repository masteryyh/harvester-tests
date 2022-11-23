import { generateName } from '@/utils/utils';
import { VmsPage } from "@/pageobjects/virtualmachine.po";
import { ImagePage } from "@/pageobjects/image.po";
import { VolumePage } from "@/pageobjects/volume.po";

const vms = new VmsPage();
const image = new ImagePage();
const volumes = new VolumePage();

/**
  * 1. Create new VM
  * 2. Export volume to image from volumes page
  * 3. Create new VM from image
  * Expected Results
  * 1. image should upload/complete in images page
  * 2. New VM should create
  */
describe("Create image from Volume", () => {
  const IMAGE_NAME = generateName("volume-export-image");
  const VM_NAME = generateName("volume-export-vm");
  const ANOTHER_VM_NAME = generateName("volume-export-vm-2");

  it("Create image from Volume", () => {
    cy.login();

    vms.init();

    // create VM
    const imageEnv = Cypress.env("image");
    const namespace = 'default';
    const value = {
      name: VM_NAME,
      cpu: "2",
      memory: "4",
      image: imageEnv.name,
      namespace
    };

    vms.create(value);

    // check VM state
    vms.goToConfigDetail(VM_NAME);

    // export IMAGE
    image.exportImage(VM_NAME, IMAGE_NAME);

    // check IMAGE state
    image.goToList();
    image.checkState({
      name: IMAGE_NAME,
      size: "10 GB",
    });

    

    // create VM
    vms.create({
      name: ANOTHER_VM_NAME,
      cpu: "2",
      memory: "4",
      image: IMAGE_NAME,
      namespace,
    });

    // check VM state
    vms.goToConfigDetail(ANOTHER_VM_NAME);

    // delete VM
    vms.delete(namespace, ANOTHER_VM_NAME);

    // delete VM
    vms.delete(namespace, VM_NAME);

    // delete IMAGE
    image.delete(IMAGE_NAME);
  });
});

/**
 * 1. Navigate to volumes page
 * 2. Click Create
 * 3. Select an image
 * 4. Input a size
 * 5. Click Create
 * Expected Results
 * 1. Page should load
 * 2. Volume should create successfully and go to succeeded in the list
 */
describe("Create volume root disk VM Image Form", () => {
  const VOLUME_NAME = generateName("volume-e2e-1");

  it("Create volume root disk VM Image Form", () => {
    cy.login();

    const imageEnv = Cypress.env("image");
    const namespace = 'default';

    // create VOLUME
    const value = {
      name: VOLUME_NAME,
      size: "10",
      image: imageEnv.name,
      namespace,
    };

    volumes.create(value);

    // check state
    volumes.checkState(value);

    // delete VOLUME
    volumes.delete(namespace, VOLUME_NAME);
  });
});

/**
  * 1. Create a VM with a root volume
  * 2. Delete the VM but not the volume
  * 3. Verify Volume still exists
  * 4. Delete the volume
  * Expected Results
  * 1. VM should create
  * 2. VM should delete
  * 3. Volume should still show in Volume list
  * 4. Volume should delete
  */
describe("Delete volume that was attached to VM but now is not", () => {
  const VM_NAME = generateName("vm-e2e-1");

  it("Delete volume that was attached to VM but now is not", () => {
    cy.login();

    const imageEnv = Cypress.env("image");
    const namespace = 'default';

    // create VM
    const value = {
      name: VM_NAME,
      cpu: "2",
      memory: "4",
      image: imageEnv.name,
      namespace,
    };

    vms.create(value);

    // check VM state
    vms.goToConfigDetail(VM_NAME);

    // delete VM
    vms.delete(namespace, VM_NAME, { removeRootDisk: false });

    // check VOLUME state
    volumes.checkStateByVM(VM_NAME);

    // delete VOLUME
    volumes.deleteVolumeByVM(VM_NAME);
  });
});

/**
  * 1. Create a virtual machine
  * 2. Create several volumes (without image)
  * 3. Add volume, hot-plug volume to virtual machine
  * 4. Open virtual machine, find hot-plugged volume
  * 5. Click de-attach volume
  * 6. Add volume again
  * Expected Results
  * 1. Can hot-plug volume without error
  * 2. Can hot-unplug the pluggable volumes without restarting VM
  * 3. The de-attached volume can also be hot-plug and mount back to VM
  */
describe("Support Volume Hot Unplug", () => {
  const VM_NAME = generateName("vm-e2e-1");
  const VOLUME_NAME_1 = generateName("hotplug-e2e-1");
  const VOLUME_NAME_2 = generateName("hotplug-e2e-2");

  it("Support Volume Hot Unplug", () => {
    cy.login();

    const imageEnv = Cypress.env("image");
    const namespace = 'default';

    // create VOLUME
    const firstVolume = {
      name: VOLUME_NAME_1,
      size: "10",
      namespace,
    };

    const secondVolume = {
      name: VOLUME_NAME_2,
      size: "10",
      namespace,
    };

    volumes.create(firstVolume);
    // check state
    volumes.checkState(firstVolume);
    
    volumes.create(secondVolume);
    // check state
    volumes.checkState(secondVolume);

    // create VM
    const value = {
      name: VM_NAME,
      cpu: "2",
      memory: "4",
      image: imageEnv.name,
      namespace,
    };

    vms.create(value);

    // check VM state
    vms.goToConfigDetail(VM_NAME);

    vms.plugVolume(VM_NAME, [VOLUME_NAME_1, VOLUME_NAME_2], namespace);
    vms.unplugVolume(VM_NAME, [VOLUME_NAME_1, VOLUME_NAME_2], namespace);
    vms.plugVolume(VM_NAME, [VOLUME_NAME_1, VOLUME_NAME_2], namespace);

    // delete VM
    vms.delete(namespace, VM_NAME);
    // delete VOLUME
    volumes.delete(namespace, VOLUME_NAME_1);
    volumes.delete(namespace, VOLUME_NAME_2);
  });
});

/**
  * 1. Stop the vm
  * 2. Navigate to volumes page
  * 3. Edit Volume via form
  * 4. Increase size
  * 5. Click Save
  * Expected Results
  * 1. Disk should be resized
  */
 describe("Edit volume increase size via form", () => {
  const VM_NAME = generateName("vm-e2e-1");

  it("Edit volume increase size via form", () => {
    cy.login();

    const imageEnv = Cypress.env("image");
    const namespace = 'default';

    // create VM
    const value = {
      name: VM_NAME,
      cpu: "2",
      memory: "4",
      image: imageEnv.name,
      namespace,
    };

    vms.create(value);

    // check VM state
    vms.goToConfigDetail(VM_NAME);
    vms.goToList();
    vms.clickAction(VM_NAME, 'Stop');
    expect(cy.contains(VM_NAME).parentsUntil("tbody", "tr").find("td").eq(1).contains('Off'));
    volumes.goToEditByVMName(VM_NAME);

    volumes.increaseSize('20', namespace);

    // delete VM
    vms.delete(namespace, VM_NAME);
  });
});

/**
  * 1. Create a VM with a root volume
  * 2. Stop the vm
  * 3. Navigate to volumes page
  * 4. Edit Volume via form
  * 5. increase size
  * 6. Click Save
  * 7. Check size of root disk
  * Expected Results
  * 1. VM should stop
  * 2. VM should reboot after saving
  * 3. Disk should be resized
  */
//  describe('Edit volume increase size via form', () => {
//     const VM_NAME = 'vm-e2e-increase-size';
//     let volumeName = '';

//     it('Edit volume increase size via form', () => {
//         cy.login();

//         // create VM
//         const value = {
//             name: VM_NAME,
//             cpu: '2',
//             memory: '4',
//             image: 'ubuntu-18.04-server-cloudimg-amd64.img',
//         }

//         cy.intercept('POST', '/v1/harvester/kubevirt.io.virtualmachines/*').as('create');
//         vms.create(value);
//         cy.wait('@create').then(res => {
//           volumeName = res.response?.body?.metadata?.labels['harvesterhci.io/cloud-init-template']
//         })

//         // check VM state
//         vms.goToConfigDetail(VM_NAME);
//         vms.goToYamlDetail(VM_NAME);

//         // stop VM
//         vms.clickAction(VM_NAME, 'Stop');

//         // increase VOLUME size
//         volumes.edit({
//           name: volumeName,
//           size: '30'
//         })

//         // check VOLUME state
//         volumes.checkState(volumeName);

//         // delete VM
//         vms.delete(VM_NAME);
//     });
// });