<template>
  <div class="recursive-tree-node">
    <div class="node-content">
      <input
        type="checkbox"
        :checked="node.checked"
        :indeterminate.prop="node.indeterminate"
        @change="onCheckboxClick"
      />
      <span class="node-label">{{ node.label }}</span>
    </div>

    <div v-if="node.children && node.children.length > 0" class="node-children">
      <RecursiveTree
        v-for="(child, index) in node.children"
        :key="child.id || index"
        :node="child"
        @update:node="(newChild) => onChildUpdate(newChild, index)"
      />
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['update:node']);

/**
 * Deep clones a node and sets the checked state for it and all its descendants.
 */
const setCheckedRecursively = (node, isChecked) => {
  const newNode = {
    ...node,
    checked: isChecked,
    indeterminate: false,
  };

  if (newNode.children) {
    newNode.children = newNode.children.map((child) =>
      setCheckedRecursively(child, isChecked)
    );
  }

  return newNode;
};

/**
 * Handles the change event for the current node's checkbox.
 */
const onCheckboxClick = (event) => {
  const isChecked = event.target.checked;
  const updatedNode = setCheckedRecursively(props.node, isChecked);
  emit('update:node', updatedNode);
};

/**
 * Handles updates from child nodes and recalculates the parent's state.
 */
const onChildUpdate = (updatedChild, index) => {
  const newChildren = [...(props.node.children || [])];
  newChildren[index] = updatedChild;

  // Calculate new state for current node based on children
  const allChecked = newChildren.every((c) => c.checked && !c.indeterminate);
  const allUnchecked = newChildren.every((c) => !c.checked && !c.indeterminate);

  const isIndeterminate = !allChecked && !allUnchecked;
  const isChecked = allChecked;

  const newNode = {
    ...props.node,
    children: newChildren,
    checked: isChecked,
    indeterminate: isIndeterminate,
  };

  emit('update:node', newNode);
};
</script>

<script>
export default {
  name: 'RecursiveTree',
};
</script>

<style scoped>
.recursive-tree-node {
  margin-left: 20px;
  font-family: sans-serif;
}

.node-content {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.node-children {
  border-left: 1px solid #eee;
}

.node-label {
  cursor: default;
}

input[type="checkbox"] {
  cursor: pointer;
}
</style>
