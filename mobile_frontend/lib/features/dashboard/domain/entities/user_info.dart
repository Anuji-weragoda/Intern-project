import 'package:equatable/equatable.dart';

class UserInfo extends Equatable {
  final String? email;
  final String? displayName;

  const UserInfo({
    this.email,
    this.displayName,
  });

  @override
  List<Object?> get props => [email, displayName];
}