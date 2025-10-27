type CardProps = {
  title: string;
  children: React.ReactNode;
};

const Card = ({ title, children }: CardProps) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition duration-300">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      <div className="text-gray-700">{children}</div>
    </div>
  );
};

export default Card;
