/**
 * todos.js
 *
 * based on the angularjs todo sample
 *
 **/
var app = angular.module('app', ['ngResource']);
app.controller('TodoCtrl', function ($scope, $resource) {
	var Todo = $resource('/api/v1/todos/:id', { id: '@_id' });
	$scope.todos = Todo.query();
	
	$scope.addTodo = function () {
		var todo = new Todo();
		todo.text = $scope.todoText;
		todo.$save(function () {
			$scope.todos.push(todo);
		});

		$scope.todoText = '';
	};
	$scope.remaining = function () {
		var count = 0;
		angular.forEach($scope.todos, function (todo) {
			count += todo.done ? 0 : 1;
		});
		return count;
	};
	$scope.save = function (item) {
		item.$save();
	};
	$scope.archive = function () {
		var oldTodos = $scope.todos;
		$scope.todos = [];
		angular.forEach(oldTodos, function (todo) {
			if (!todo.done) {
				$scope.todos.push(todo);
			}
		});
		
		Todo.delete({ done: true });
	};
});
