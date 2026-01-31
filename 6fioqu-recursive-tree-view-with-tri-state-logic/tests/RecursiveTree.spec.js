import { mount } from '@vue/test-utils';
import RecursiveTree from '../repository_after/RecursiveTree.vue';

describe('RecursiveTree.vue', () => {
  const createNode = (id, label, checked = false, children = []) => ({
    id,
    label,
    checked,
    children,
    indeterminate: false, // Default to false
  });

  const generateTree = () => createNode('root', 'Root', false, [
    createNode('c1', 'Child 1', false),
    createNode('c2', 'Child 2', false, [
      createNode('c2-1', 'Grandchild 1', false),
      createNode('c2-2', 'Grandchild 2', false),
    ]),
  ]);

  it('renders the tree structure correctly', () => {
    const wrapper = mount(RecursiveTree, {
      props: {
        node: generateTree(),
      },
    });

    expect(wrapper.text()).toContain('Root');
    expect(wrapper.text()).toContain('Child 1');
    expect(wrapper.text()).toContain('Child 2');
    expect(wrapper.text()).toContain('Grandchild 1');
    expect(wrapper.findAll('input[type="checkbox"]').length).toBe(5);
  });

  it('checking a parent selects all descendants', async () => {
    const rootNode = generateTree();
    const wrapper = mount(RecursiveTree, {
      props: { node: rootNode },
    });

    // Check the root checkbox
    await wrapper.find('input[type="checkbox"]').setValue(true);

    // Verify emit
    const emittedEvents = wrapper.emitted('update:node');
    expect(emittedEvents).toBeTruthy();
    const updatedNode = emittedEvents[0][0];

    expect(updatedNode.checked).toBe(true);
    expect(updatedNode.children[0].checked).toBe(true);
    expect(updatedNode.children[1].checked).toBe(true);
    expect(updatedNode.children[1].children[0].checked).toBe(true);
    expect(updatedNode.children[1].children[1].checked).toBe(true);
  });

  it('unchecking a parent deselects all descendants', async () => {
    // Start with a fully checked tree
    const rootNode = createNode('root', 'Root', true, [
      createNode('c1', 'Child 1', true),
    ]);
    const wrapper = mount(RecursiveTree, {
      props: { node: rootNode },
    });

    await wrapper.find('input[type="checkbox"]').setValue(false);

    const emittedEvents = wrapper.emitted('update:node');
    const updatedNode = emittedEvents[0][0];

    expect(updatedNode.checked).toBe(false);
    expect(updatedNode.children[0].checked).toBe(false);
  });

  it('checking a child updates parent to indeterminate if not all satisfied', async () => {
    const rootNode = generateTree();
    // Render the tree
    const wrapper = mount(RecursiveTree, {
      props: { node: rootNode },
    });
 
    // Let's target Child 1 checkbox.
    const checkboxes = wrapper.findAll('input[type="checkbox"]');
    
    await checkboxes[1].setValue(true); // Check Child 1

    const emitted = wrapper.emitted('update:node');
    expect(emitted).toBeTruthy();
    const updatedRoot = emitted[0][0];

    expect(updatedRoot.children[0].checked).toBe(true); // Child 1 checked
    expect(updatedRoot.children[1].checked).toBe(false); // Child 2 unchecked
    
    // Root should be indeterminate
    expect(updatedRoot.indeterminate).toBe(true);
    expect(updatedRoot.checked).toBe(false);
  });

  it('checking all children makes parent checked', async () => {
    // Start with one child unchecked
     const rootNode = createNode('root', 'Root', false, [
      createNode('c1', 'Child 1', true),
      createNode('c2', 'Child 2', false),
    ]);
    // Note: Technically the input root should likely be indeterminate, but let's assume we start from this state.
    
    const wrapper = mount(RecursiveTree, {
      props: { node: rootNode },
    });

    const checkboxes = wrapper.findAll('input[type="checkbox"]');
    
    await checkboxes[2].setValue(true);

    const emitted = wrapper.emitted('update:node');
    const updatedRoot = emitted[0][0];

    expect(updatedRoot.checked).toBe(true);
    expect(updatedRoot.indeterminate).toBe(false);
  });

  it('correctly calculates indeterminate state for deep nesting', async () => {
    // Structure: Root -> Child 1 -> Grandchild 1
    const rootNode = createNode('root', 'Root', false, [
      createNode('c1', 'Child 1', false, [
        createNode('gc1', 'Grandchild 1', false)
      ])
    ]);

    const wrapper = mount(RecursiveTree, {
      props: { node: rootNode },
    });

    const checkboxes = wrapper.findAll('input[type="checkbox"]');
    // Index 0: Root, Index 1: Child 1, Index 2: Grandchild 1
    
    // Check Grandchild 1
    await checkboxes[2].setValue(true);

    const emitted = wrapper.emitted('update:node');
    const updatedRoot = emitted[0][0];

    // Grandchild 1 should be checked
    expect(updatedRoot.children[0].children[0].checked).toBe(true);
    // Child 1 should be checked (only child is checked)
    expect(updatedRoot.children[0].checked).toBe(true);
    // Root should be checked (only child is checked)
    expect(updatedRoot.checked).toBe(true);

    // Now consider a more complex case: Root -> [C1 -> [GC1], C2]
    const rootNodeComplex = createNode('root', 'Root', false, [
      createNode('c1', 'Child 1', false, [
        createNode('gc1', 'Grandchild 1', false)
      ]),
      createNode('c2', 'Child 2', false)
    ]);

    const wrapper2 = mount(RecursiveTree, {
      props: { node: rootNodeComplex },
    });

    const checkboxes2 = wrapper2.findAll('input[type="checkbox"]');
    // Index 2 is GC1
    await checkboxes2[2].setValue(true);

    const emitted2 = wrapper2.emitted('update:node');
    const updatedRoot2 = emitted2[0][0];

    // C1 should be checked (because its only child GC1 is checked)
    expect(updatedRoot2.children[0].checked).toBe(true);
    // Root should be indeterminate (C1 is checked, C2 is unchecked)
    expect(updatedRoot2.indeterminate).toBe(true);
    expect(updatedRoot2.checked).toBe(false);
  });

  it('sets the DOM indeterminate property correctly', async () => {
    const rootNode = createNode('root', 'Root', false, [
      createNode('c1', 'Child 1', true),
      createNode('c2', 'Child 2', false),
    ]);
    
    const wrapper = mount(RecursiveTree, {
      props: { 
        node: { ...rootNode, indeterminate: true } 
      },
    });

    const rootCheckbox = wrapper.find('input[type="checkbox"]').element;
    expect(rootCheckbox.indeterminate).toBe(true);
  });

  it('handles empty folders being selectable without affecting parent if not checked', async () => {
    const rootNode = createNode('root', 'Root', false, [
      createNode('empty-folder', 'Empty Folder', false, [])
    ]);

    const wrapper = mount(RecursiveTree, {
      props: { node: rootNode },
    });

    const checkboxes = wrapper.findAll('input[type="checkbox"]');
    await checkboxes[1].setValue(true);

    const emitted = wrapper.emitted('update:node');
    const updatedRoot = emitted[0][0];

    expect(updatedRoot.children[0].checked).toBe(true);
    expect(updatedRoot.checked).toBe(true);
  });
});
