import React from 'react';
import { Box, Text } from 'ink';
import { useAppStore, TodoItem } from '../state/store.js'; 

export const TodoTracker: React.FC = () => {
  const todos = useAppStore((state) => state.todos);

  if (!todos || todos.length === 0) {
    return (
      <Box borderStyle="round" borderColor="gray" paddingX={1}>
        <Text color="gray">No pending tasks</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} width="100%">
      <Box marginBottom={1}>
        <Text bold color="cyan">📋 Task Tracker</Text>
      </Box>
      {todos.map((todo) => {
        let statusIcon = '⏳';
        let statusColor = 'yellow';
        if (todo.status === 'in_progress') {
          statusIcon = '🔄';
          statusColor = 'blue';
        } else if (todo.status === 'completed') {
          statusIcon = '✅';
          statusColor = 'green';
        }

        let priorityColor = 'green';
        if (todo.priority === 'high') priorityColor = 'red';
        if (todo.priority === 'medium') priorityColor = 'yellow';

        return (
          <Box key={todo.id} flexDirection="row" marginBottom={0}>
            <Box width={3}>
              <Text>{statusIcon}</Text>
            </Box>
            <Box width={15}>
              <Text color={statusColor}>{todo.status}</Text>
            </Box>
            <Box width={10}>
              <Text color={priorityColor}>[{todo.priority}]</Text>
            </Box>
            <Box flexGrow={1}>
              <Text 
                color={todo.status === 'completed' ? 'gray' : 'white'} 
                dimColor={todo.status === 'completed'}
              >
                {todo.content}
              </Text>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};
